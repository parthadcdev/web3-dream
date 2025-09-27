#!/usr/bin/env node

import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Linear client
const linearClient = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY,
});

async function getIssuesToUpdate() {
  try {
    const query = `
      query Issues($first: Int) {
        issues(first: $first) {
          nodes {
            id
            identifier
            title
            state {
              id
              name
              type
            }
            project {
              id
              name
            }
          }
        }
      }
    `;
    
    const result = await linearClient.client.request(query, { first: 30 });
    
    // Filter for TraceSecur project issues that are in Backlog or Todo
    const issuesToUpdate = result.issues.nodes.filter(issue => {
      const isTraceSecurProject = issue.project && issue.project.name.toLowerCase().includes('tracesecur');
      const isNotDone = issue.state.name !== 'Done' && issue.state.name !== 'Canceled';
      const isNotInProgress = issue.state.name !== 'In Progress';
      return isTraceSecurProject && isNotDone && isNotInProgress;
    });
    
    console.log(`Found ${issuesToUpdate.length} TraceSecur issues to update to In Progress`);
    return issuesToUpdate;
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    throw error;
  }
}

async function getInProgressStateId() {
  try {
    const query = `
      query WorkflowStates {
        workflowStates {
          nodes {
            id
            name
            type
          }
        }
      }
    `;
    
    const result = await linearClient.client.request(query);
    const inProgressState = result.workflowStates.nodes.find(state => 
      state.name === 'In Progress' || state.name === 'In Progress'
    );
    
    if (inProgressState) {
      console.log(`Found In Progress state: ${inProgressState.name} (ID: ${inProgressState.id})`);
      return inProgressState.id;
    } else {
      // If no exact match, try to find a state that contains "progress" or "active"
      const progressState = result.workflowStates.nodes.find(state => 
        state.name.toLowerCase().includes('progress') || 
        state.name.toLowerCase().includes('active') ||
        state.type === 'started'
      );
      
      if (progressState) {
        console.log(`Found progress state: ${progressState.name} (ID: ${progressState.id})`);
        return progressState.id;
      } else {
        console.log('Available states:');
        result.workflowStates.nodes.forEach(state => {
          console.log(`- ${state.name} (${state.type})`);
        });
        throw new Error('In Progress state not found');
      }
    }
  } catch (error) {
    console.error('Error fetching workflow states:', error.message);
    throw error;
  }
}

async function updateIssueStatus(issueId, stateId) {
  try {
    const mutation = `
      mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            state {
              name
            }
          }
        }
      }
    `;
    
    const result = await linearClient.client.request(mutation, {
      id: issueId,
      input: {
        stateId: stateId
      }
    });
    
    if (result.issueUpdate.success) {
      const issue = result.issueUpdate.issue;
      console.log(`✅ Updated ${issue.identifier}: ${issue.title} -> ${issue.state.name}`);
      return true;
    } else {
      console.log(`❌ Failed to update issue ${issueId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating issue ${issueId}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Updating TraceSecur issues to In Progress status...\n');
    
    // Get In Progress state ID
    const stateId = await getInProgressStateId();
    
    // Get issues to update
    const issues = await getIssuesToUpdate();
    
    if (issues.length === 0) {
      console.log('No issues need to be updated to In Progress status.');
      return;
    }
    
    console.log('\nUpdating issues to In Progress...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    // Update each issue to In Progress status
    for (const issue of issues) {
      console.log(`Updating ${issue.identifier}: ${issue.title}...`);
      const success = await updateIssueStatus(issue.id, stateId);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n🎉 Status update complete!`);
    console.log(`✅ Successfully updated: ${successCount} issues`);
    console.log(`❌ Failed to update: ${failCount} issues`);
    
  } catch (error) {
    console.error('❌ Error in main process:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
