const SkillLoader = require('../services/skillLoader');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

/**
 * BuildPlan Skills CLI
 * Manage agent skills (list, add, remove, validate)
 * Usage: node src/commands/skills.js <command> [options]
 */

const SKILLS_DIR = path.join(process.env.PROJECT_ROOT || '', 'buildplan-agents', 'skills');

/**
 * List all skills
 */
async function listSkills(options = {}) {
  const { agent = null, category = null, detailed = false } = options;

  console.log('📚 BuildPlan Skills\n');

  try {
    // Get all skills
    const skillsPath = SKILLS_DIR;
    const categories = await fs.readdir(skillsPath);

    for (const cat of categories) {
      if (category && cat !== category) continue;

      const catPath = path.join(skillsPath, cat);
      const stat = await fs.stat(catPath);

      if (!stat.isDirectory()) continue;

      console.log(`\n📁 ${cat}/`);

      const skillDirs = await fs.readdir(catPath);

      for (const skillDir of skillDirs) {
        const skillPath = path.join(catPath, skillDir, 'SKILL.md');

        try {
          const skillContent = await fs.readFile(skillPath, 'utf8');
          const skill = SkillLoader.parseSkill(skillContent);

          if (agent && !skill.agents.includes(agent)) continue;

          console.log(`  • ${skill.name} (${skill.version})`);

          if (detailed) {
            console.log(`    Description: ${skill.description}`);
            console.log(`    Agents: ${skill.agents.join(', ')}`);
            if (skill.dependencies.length > 0) {
              console.log(`    Dependencies: ${skill.dependencies.join(', ')}`);
            }
            if (skill.examples.length > 0) {
              console.log(`    Examples: ${skill.examples.length}`);
            }
          }
        } catch (error) {
          console.log(`  • ${skillDir} (invalid)`);
        }
      }
    }

    console.log('\n');
  } catch (error) {
    console.error(`Error listing skills: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Search skills by keyword
 */
async function searchSkills(keyword) {
  console.log(`🔍 Searching for "${keyword}"...\n`);

  try {
    const skillsPath = SKILLS_DIR;
    const categories = await fs.readdir(skillsPath);
    let found = 0;

    for (const cat of categories) {
      const catPath = path.join(skillsPath, cat);
      const stat = await fs.stat(catPath);

      if (!stat.isDirectory()) continue;

      const skillDirs = await fs.readdir(catPath);

      for (const skillDir of skillDirs) {
        const skillPath = path.join(catPath, skillDir, 'SKILL.md');

        try {
          const skillContent = await fs.readFile(skillPath, 'utf8');
          const skill = SkillLoader.parseSkill(skillContent);

          // Search in name, description, and content
          const searchText = `${skill.name} ${skill.description} ${skill.content}`.toLowerCase();

          if (searchText.includes(keyword.toLowerCase())) {
            console.log(`✓ ${cat}/${skill.name}`);
            console.log(`  ${skill.description}`);
            console.log(`  Agents: ${skill.agents.join(', ')}\n`);
            found++;
          }
        } catch (error) {
          // Skip invalid skills
        }
      }
    }

    if (found === 0) {
      console.log('No skills found matching your search.\n');
    } else {
      console.log(`Found ${found} skill(s).\n`);
    }
  } catch (error) {
    console.error(`Error searching skills: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Validate a skill file
 */
async function validateSkill(skillPath) {
  console.log(`✓ Validating skill at ${skillPath}...\n`);

  try {
    const skillContent = await fs.readFile(skillPath, 'utf8');
    const skill = SkillLoader.parseSkill(skillContent);

    console.log('✅ Skill is valid!\n');
    console.log(`Name: ${skill.name}`);
    console.log(`Version: ${skill.version}`);
    console.log(`Description: ${skill.description}`);
    console.log(`Agents: ${skill.agents.join(', ')}`);
    console.log(`Category: ${skill.category || 'Not specified'}`);

    if (skill.dependencies.length > 0) {
      console.log(`Dependencies: ${skill.dependencies.join(', ')}`);
    }

    if (skill.examples.length > 0) {
      console.log(`Examples: ${skill.examples.length}`);
    }

    console.log('\n');
  } catch (error) {
    console.error(`❌ Skill is invalid: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * Interactive skill creation wizard
 */
async function createSkill() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log('🎨 Create New Skill\n');

  try {
    const name = await question('Skill name: ');
    const category = await question('Category (e.g., backend, frontend, devops): ');
    const description = await question('Description: ');
    const agentsStr = await question('Agents (comma-separated, e.g., backend-agent,frontend-agent): ');
    const version = await question('Version [1.0.0]: ') || '1.0.0';
    const dependenciesStr = await question('Dependencies (comma-separated, optional): ');

    const agents = agentsStr.split(',').map(a => a.trim()).filter(Boolean);
    const dependencies = dependenciesStr ? dependenciesStr.split(',').map(d => d.trim()).filter(Boolean) : [];

    // Generate SKILL.md content
    const skillContent = `---
name: ${name}
version: ${version}
category: ${category}
description: ${description}
agents:
${agents.map(a => `  - ${a}`).join('\n')}
${dependencies.length > 0 ? `dependencies:\n${dependencies.map(d => `  - ${d}`).join('\n')}` : ''}
---

# ${name}

${description}

## Usage

\`\`\`javascript
// Add usage examples here
\`\`\`

## Examples

### Example 1

\`\`\`javascript
// Add example code here
\`\`\`

## Notes

- Add important notes here
`;

    // Create directory structure
    const skillDir = path.join(SKILLS_DIR, category, name.toLowerCase().replace(/\s+/g, '-'));
    await fs.mkdir(skillDir, { recursive: true });

    // Write SKILL.md
    const skillPath = path.join(skillDir, 'SKILL.md');
    await fs.writeFile(skillPath, skillContent, 'utf8');

    console.log(`\n✅ Skill created at: ${skillPath}`);
    console.log('\nYou can now edit the SKILL.md file to add more details.\n');
  } catch (error) {
    console.error(`\nError creating skill: ${error.message}\n`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * Remove a skill
 */
async function removeSkill(category, skillName) {
  console.log(`🗑️  Removing skill: ${category}/${skillName}\n`);

  try {
    const skillDir = path.join(SKILLS_DIR, category, skillName);
    
    // Check if exists
    try {
      await fs.access(skillDir);
    } catch {
      console.error(`Skill not found: ${category}/${skillName}\n`);
      process.exit(1);
    }

    // Confirm deletion
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));
    const confirm = await question('Are you sure you want to delete this skill? (yes/no): ');
    
    rl.close();

    if (confirm.toLowerCase() !== 'yes') {
      console.log('Deletion cancelled.\n');
      return;
    }

    // Delete directory
    await fs.rm(skillDir, { recursive: true, force: true });
    
    console.log(`✅ Skill removed: ${category}/${skillName}\n`);
  } catch (error) {
    console.error(`Error removing skill: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
BuildPlan Skills CLI

Usage: node src/commands/skills.js <command> [options]

Commands:
  list [options]              List all skills
    --agent <name>            Filter by agent
    --category <name>         Filter by category
    --detailed                Show detailed info

  search <keyword>            Search skills by keyword

  validate <path>             Validate a SKILL.md file

  create                      Interactive skill creation wizard

  remove <category> <name>    Remove a skill

  help                        Show this help message

Examples:
  node src/commands/skills.js list
  node src/commands/skills.js list --agent backend-agent --detailed
  node src/commands/skills.js search "database"
  node src/commands/skills.js validate skills/backend/prisma-query/SKILL.md
  node src/commands/skills.js create
  node src/commands/skills.js remove backend prisma-query
`);
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help') {
    showHelp();
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'list': {
        const options = {
          agent: args.includes('--agent') ? args[args.indexOf('--agent') + 1] : null,
          category: args.includes('--category') ? args[args.indexOf('--category') + 1] : null,
          detailed: args.includes('--detailed')
        };
        await listSkills(options);
        break;
      }

      case 'search': {
        if (args.length < 2) {
          console.error('Error: search requires a keyword\n');
          process.exit(1);
        }
        await searchSkills(args[1]);
        break;
      }

      case 'validate': {
        if (args.length < 2) {
          console.error('Error: validate requires a file path\n');
          process.exit(1);
        }
        await validateSkill(args[1]);
        break;
      }

      case 'create': {
        await createSkill();
        break;
      }

      case 'remove': {
        if (args.length < 3) {
          console.error('Error: remove requires category and skill name\n');
          process.exit(1);
        }
        await removeSkill(args[1], args[2]);
        break;
      }

      default:
        console.error(`Unknown command: ${command}\n`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { listSkills, searchSkills, validateSkill, createSkill, removeSkill };
