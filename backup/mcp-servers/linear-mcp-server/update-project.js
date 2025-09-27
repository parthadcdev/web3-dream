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
      throw new Error('TraceSecur project not found');
    }
  } catch (error) {
    console.error('Error fetching projects:', error.message);
    throw error;
  }
}

async function updateProject(projectId) {
  try {
    const mutation = `
      mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) {
        projectUpdate(id: $id, input: $input) {
          success
          project {
            id
            name
            description
            state
            progress
            startDate
            targetDate
            completedAt
            lead {
              id
              name
            }
            teams {
              nodes {
                id
                name
              }
            }
          }
        }
      }
    `;
    
    const input = {
      name: "TraceSecur - Decentralized Traceability Platform",
      description: "Decentralized traceability platform for SMEs with blockchain, IoT, and $TRACE token integration. 18-month roadmap with 4 phases.",
      state: "started",
      startDate: new Date('2024-01-01').toISOString(),
      targetDate: new Date('2025-06-30').toISOString(), // 18-month timeline
    };
    
    const result = await linearClient.client.request(mutation, {
      id: projectId,
      input: input
    });
    
    if (result.projectUpdate.success) {
      const project = result.projectUpdate.project;
      console.log('✅ Successfully updated TraceSecur project:');
      console.log(`   Name: ${project.name}`);
      console.log(`   State: ${project.state}`);
      console.log(`   Start Date: ${project.startDate}`);
      console.log(`   Target Date: ${project.targetDate}`);
      return true;
    } else {
      console.log('❌ Failed to update project');
      return false;
    }
  } catch (error) {
    console.error('❌ Error updating project:', error.message);
    return false;
  }
}

async function createProjectLabels() {
  try {
    console.log('\n📋 Creating project labels...');
    
    const labels = [
      { name: 'Critical', color: '#ff0000', description: 'Critical priority issues' },
      { name: 'High Priority', color: '#ff8800', description: 'High priority issues' },
      { name: 'Medium Priority', color: '#ffaa00', description: 'Medium priority issues' },
      { name: 'Low Priority', color: '#00aa00', description: 'Low priority issues' },
      { name: 'Epic', color: '#8b5cf6', description: 'Large features requiring multiple sprints' },
      { name: 'Story', color: '#3b82f6', description: 'User stories and feature requirements' },
      { name: 'Task', color: '#10b981', description: 'Development tasks and implementation work' },
      { name: 'Bug', color: '#ef4444', description: 'Defects and issues to fix' },
      { name: 'Backend', color: '#6366f1', description: 'Backend development work' },
      { name: 'Frontend', color: '#06b6d4', description: 'Frontend development work' },
      { name: 'Blockchain', color: '#f59e0b', description: 'Smart contract and blockchain work' },
      { name: 'DevOps', color: '#84cc16', description: 'Infrastructure and deployment work' },
      { name: 'Database', color: '#8b5cf6', description: 'Database and data work' },
      { name: 'Security', color: '#dc2626', description: 'Security-related work' },
      { name: 'Testing', color: '#059669', description: 'Testing and QA work' },
      { name: 'Documentation', color: '#6b7280', description: 'Documentation work' },
      { name: 'Production Ready', color: '#10b981', description: 'Production readiness work' },
      { name: 'TraceChain V2', color: '#7c3aed', description: 'TraceChain V2 features' },
      { name: 'IoT Integration', color: '#0891b2', description: 'IoT and device integration' },
      { name: 'Token Integration', color: '#f59e0b', description: 'Token and reward system work' }
    ];
    
    for (const label of labels) {
      try {
        const mutation = `
          mutation LabelCreate($input: LabelCreateInput!) {
            labelCreate(input: $input) {
              success
              label {
                id
                name
                color
              }
            }
          }
        `;
        
        const result = await linearClient.client.request(mutation, {
          input: {
            name: label.name,
            color: label.color,
            description: label.description,
            teamId: process.env.LINEAR_TEAM_ID
          }
        });
        
        if (result.labelCreate.success) {
          console.log(`   ✅ Created label: ${label.name}`);
        } else {
          console.log(`   ⚠️  Label ${label.name} may already exist`);
        }
      } catch (error) {
        console.log(`   ⚠️  Label ${label.name} may already exist: ${error.message}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('Error creating labels:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Updating TraceSecur project with comprehensive properties...\n');
    
    // Get TraceSecur project ID
    const projectId = await getProjectId();
    
    // Update project properties
    console.log('📝 Updating project details...');
    const updateSuccess = await updateProject(projectId);
    
    if (updateSuccess) {
      console.log('\n✅ Project updated successfully!');
    } else {
      console.log('\n❌ Failed to update project');
      return;
    }
    
    // Create project labels
    await createProjectLabels();
    
    console.log('\n🎉 TraceSecur project setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to https://linear.app/axonsphere');
    console.log('2. View the TraceSecur project');
    console.log('3. Start working on high-priority issues');
    console.log('4. Use the created labels to organize work');
    
  } catch (error) {
    console.error('❌ Error in main process:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
