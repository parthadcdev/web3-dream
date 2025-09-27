#!/usr/bin/env node

import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Linear client
const linearClient = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY,
});

// Define issue categorization
const issueCategories = {
  // BUGS - Issues that need fixing
  bugs: [
    'AXO-10', // Database Schema Implementation - Critical missing tables
    'AXO-11', // JWT Authentication System - Missing implementation
    'AXO-12', // Blockchain Integration - Missing implementation
    'AXO-15', // Test Suite Fixes - Broken tests
    'AXO-19', // TraceToken Contract Deployment - Compilation errors
    'AXO-20', // ProductRegistry Contract Integration - Missing implementation
    'AXO-21', // Fix Smart Contract Compilation Errors - Critical bug
    'AXO-23', // Fix Critical API Security Vulnerabilities - Security bug
    'AXO-24', // Implement API Performance Optimizations - Performance issues
    'AXO-25', // Enhance Input Sanitization and Error Handling - Security bug
    'AXO-26', // Smart Contract Security Improvements - Security bug
    'AXO-27', // Production Readiness Assessment - Missing production setup
  ],
  
  // FEATURES - New functionality to be built
  features: [
    'AXO-6',  // Epic 1: Production Readiness - Critical Integrations
    'AXO-7',  // Epic 2: TraceChain V2 - Token Integration
    'AXO-8',  // Epic 3: Smart Contract Development
    'AXO-9',  // Epic 4: IoT Integration & Advanced Features
    'AXO-13', // External API Integrations
    'AXO-14', // MQTT Broker Setup
    'AXO-16', // Custodial Wallet Service
    'AXO-17', // Onboarding Wizard Framework
    'AXO-18', // TracePoints Reward System
    'AXO-22', // Production Environment Setup
  ]
};

async function getWorkflowStates() {
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
    return result.workflowStates.nodes;
  } catch (error) {
    console.error('Error fetching workflow states:', error.message);
    throw error;
  }
}

async function getIssuesToCategorize() {
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
    
    // Filter for TraceSecur project issues
    const traceSecurIssues = result.issues.nodes.filter(issue => 
      issue.project && issue.project.name.toLowerCase().includes('tracesecur')
    );
    
    return traceSecurIssues;
  } catch (error) {
    console.error('Error fetching issues:', error.message);
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

async function addLabelToIssue(issueId, labelName) {
  try {
    // First, get or create the label
    const labelQuery = `
      query IssueLabels($filter: IssueLabelFilter) {
        issueLabels(filter: $filter) {
          nodes {
            id
            name
          }
        }
      }
    `;
    
    const labelResult = await linearClient.client.request(labelQuery, {
      filter: { name: { eq: labelName } }
    });
    
    let labelId = null;
    if (labelResult.issueLabels.nodes.length > 0) {
      labelId = labelResult.issueLabels.nodes[0].id;
    } else {
      // Create the label if it doesn't exist
      const createLabelMutation = `
        mutation IssueLabelCreate($input: IssueLabelCreateInput!) {
          issueLabelCreate(input: $input) {
            success
            issueLabel {
              id
              name
            }
          }
        }
      `;
      
      const createResult = await linearClient.client.request(createLabelMutation, {
        input: {
          name: labelName,
          color: labelName === 'Bug' ? '#ef4444' : '#3b82f6', // Red for bugs, blue for features
          teamId: process.env.LINEAR_TEAM_ID
        }
      });
      
      if (createResult.issueLabelCreate.success) {
        labelId = createResult.issueLabelCreate.issueLabel.id;
        console.log(`✅ Created label: ${labelName}`);
      }
    }
    
    if (labelId) {
      // Add label to issue
      const addLabelMutation = `
        mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              labels {
                nodes {
                  id
                  name
                }
              }
            }
          }
        }
      `;
      
      const result = await linearClient.client.request(addLabelMutation, {
        id: issueId,
        input: {
          labelIds: [labelId]
        }
      });
      
      if (result.issueUpdate.success) {
        console.log(`✅ Added ${labelName} label to issue`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error adding label to issue ${issueId}:`, error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Categorizing TraceSecur issues as Bugs and Features...\n');
    
    // Get workflow states
    const states = await getWorkflowStates();
    const inProgressState = states.find(state => state.name === 'In Progress');
    const backlogState = states.find(state => state.name === 'Backlog' || state.name === 'Todo');
    
    if (!inProgressState || !backlogState) {
      console.error('❌ Required workflow states not found');
      console.log('Available states:', states.map(s => s.name));
      return;
    }
    
    console.log(`Found states: In Progress (${inProgressState.id}), Backlog (${backlogState.id})\n`);
    
    // Get issues to categorize
    const issues = await getIssuesToCategorize();
    console.log(`Found ${issues.length} TraceSecur issues to categorize\n`);
    
    let bugCount = 0;
    let featureCount = 0;
    let bugSuccess = 0;
    let featureSuccess = 0;
    
    // Process each issue
    for (const issue of issues) {
      const identifier = issue.identifier;
      const isBug = issueCategories.bugs.includes(identifier);
      const isFeature = issueCategories.features.includes(identifier);
      
      if (isBug) {
        console.log(`🐛 Processing BUG: ${identifier} - ${issue.title}`);
        bugCount++;
        
        // Update status to In Progress
        const statusSuccess = await updateIssueStatus(issue.id, inProgressState.id);
        
        // Add Bug label
        const labelSuccess = await addLabelToIssue(issue.id, 'Bug');
        
        if (statusSuccess && labelSuccess) {
          bugSuccess++;
        }
        
      } else if (isFeature) {
        console.log(`✨ Processing FEATURE: ${identifier} - ${issue.title}`);
        featureCount++;
        
        // Update status to Backlog
        const statusSuccess = await updateIssueStatus(issue.id, backlogState.id);
        
        // Add Feature label
        const labelSuccess = await addLabelToIssue(issue.id, 'Feature');
        
        if (statusSuccess && labelSuccess) {
          featureSuccess++;
        }
        
      } else {
        console.log(`⚠️  Skipping ${identifier} - ${issue.title} (not categorized)`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`\n🎉 Categorization complete!`);
    console.log(`\n📊 Summary:`);
    console.log(`🐛 Bugs: ${bugSuccess}/${bugCount} successfully updated to In Progress`);
    console.log(`✨ Features: ${featureSuccess}/${featureCount} successfully updated to Backlog`);
    console.log(`\n📋 Next steps:`);
    console.log(`1. Focus on fixing bugs first (marked as In Progress)`);
    console.log(`2. Plan features for future sprints (marked as Backlog)`);
    console.log(`3. Use Linear labels to filter by Bug/Feature type`);
    
  } catch (error) {
    console.error('❌ Error in main process:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
