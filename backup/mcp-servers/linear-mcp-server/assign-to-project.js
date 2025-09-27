#!/usr/bin/env node

import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Linear client
const linearClient = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY,
});

async function getProjectId() {
  try {
    const query = `
      query Projects {
        projects {
          nodes {
            id
            name
            description
            state
          }
        }
      }
    `;
    
    const result = await linearClient.client.request(query);
    const traceSecurProject = result.projects.nodes.find(project => 
      project.name.toLowerCase().includes('tracesecur')
    );
    
    if (traceSecurProject) {
      console.log(`Found TraceSecur project: ${traceSecurProject.name} (ID: ${traceSecurProject.id})`);
      return traceSecurProject.id;
    } else {
      console.log('Available projects:');
      result.projects.nodes.forEach(project => {
        console.log(`- ${project.name} (ID: ${project.id})`);
      });
      throw new Error('TraceSecur project not found');
    }
  } catch (error) {
    console.error('Error fetching projects:', error.message);
    throw error;
  }
}

async function getIssuesToAssign() {
  try {
    const query = `
      query Issues($first: Int) {
        issues(first: $first) {
          nodes {
            id
            identifier
            title
            project {
              id
              name
            }
          }
        }
      }
    `;
    
    const result = await linearClient.client.request(query, { first: 25 });
    
    // Filter out issues that are already assigned to TraceSecur or are Linear's default issues
    const issuesToAssign = result.issues.nodes.filter(issue => {
      const isLinearDefault = ['AXO-1', 'AXO-2', 'AXO-3', 'AXO-4'].includes(issue.identifier);
      const isAlreadyAssigned = issue.project && issue.project.name.toLowerCase().includes('tracesecur');
      return !isLinearDefault && !isAlreadyAssigned;
    });
    
    console.log(`Found ${issuesToAssign.length} issues to assign to TraceSecur project`);
    return issuesToAssign;
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    throw error;
  }
}

async function assignIssueToProject(issueId, projectId) {
  try {
    const mutation = `
      mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            project {
              id
              name
            }
          }
        }
      }
    `;
    
    const result = await linearClient.client.request(mutation, {
      id: issueId,
      input: {
        projectId: projectId
      }
    });
    
    if (result.issueUpdate.success) {
      const issue = result.issueUpdate.issue;
      console.log(`✅ Assigned ${issue.identifier}: ${issue.title}`);
      return true;
    } else {
      console.log(`❌ Failed to assign issue ${issueId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error assigning issue ${issueId}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting issue assignment to TraceSecur project...\n');
    
    // Get TraceSecur project ID
    const projectId = await getProjectId();
    
    // Get issues to assign
    const issues = await getIssuesToAssign();
    
    if (issues.length === 0) {
      console.log('No issues need to be assigned to TraceSecur project.');
      return;
    }
    
    console.log('\nAssigning issues to TraceSecur project...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    // Assign each issue to the TraceSecur project
    for (const issue of issues) {
      console.log(`Assigning ${issue.identifier}: ${issue.title}...`);
      const success = await assignIssueToProject(issue.id, projectId);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n🎉 Assignment complete!`);
    console.log(`✅ Successfully assigned: ${successCount} issues`);
    console.log(`❌ Failed to assign: ${failCount} issues`);
    
  } catch (error) {
    console.error('❌ Error in main process:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
