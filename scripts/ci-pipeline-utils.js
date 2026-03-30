#!/usr/bin/env node

/**
 * CI Pipeline Utilities - Advanced Filtering and Sorting Options
 * 
 * This utility provides advanced filtering and sorting options for the CI pipeline,
 * enabling smart test selection, better reporting, and improved performance.
 * 
 * Features:
 * - Filter tests by type (unit, integration, snapshot, e2e)
 * - Filter tests by changed files/paths
 * - Sort test results by execution time, failure status, or name
 * - Generate detailed CI reports with filtering options
 * - Support for git-based change detection
 * 
 * @issue Filter and sort options enhance developer velocity and reduced CI waste
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test type detection patterns
 * @type {Record<string, RegExp>}
 */
const TEST_TYPE_PATTERNS = {
  unit: /\.test\.[jt]sx?$/,
  integration: /\.integration\.test\.[jt]sx?$/,
  snapshot: /\.snapshot\.test\.[jt]sx?$/,
  e2e: /\.e2e\.test\.[jt]sx?$/,
  'csp-test': /\.csp\.test\.[jt]sx?$/,
  'csv-export': /\.csv-export\.test\.[jt]sx?$/,
  'async-test': /\.async\.integration\.test\.[jt]sx?$/,
  'staging-test': /\.staging\.test\.[jt]sx?$/,
  'focus-trap': /\.focusTrap\.test\.[jt]sx?$/,
  'memo-test': /\.memo\.test\.[jt]sx?$/,
  'race-test': /\.race\.test\.[jt]sx?$/,
};

/**
 * Component-to-test-file mapping for better filtering
 * @type {Record<string, string[]>}
 */
const FILE_MAPPINGS = {
  'src/context/': ['DataContext', 'AuthContext', 'ThemeContext'],
  'src/components/': ['Components', 'Forms', 'Tables', 'UI'],
  'src/pages/': ['Page'],
  'src/hooks/': ['Hook'],
  'src/utils/': ['Utils'],
  'src/services/': ['Service', 'API'],
  'src/security/': ['Security', 'CSP'],
};

/**
 * CI Pipeline Utilities Class
 */
class CIPipelineUtils {
  constructor() {
    this.testFiles = [];
    this.changedFiles = [];
  }

  /**
   * Discover all test files in the project
   * @returns {string[]} Array of test file paths
   */
  discoverTestFiles() {
    const testDir = path.join(process.cwd(), 'src', 'test');
    if (!fs.existsSync(testDir)) {
      console.warn('⚠️  Test directory not found:', testDir);
      return [];
    }

    const testFiles = [];
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (/\.test\.[jt]sx?$/.test(file)) {
          testFiles.push(path.relative(process.cwd(), filePath));
        }
      });
    };

    walkDir(testDir);
    this.testFiles = testFiles;
    return testFiles;
  }

  /**
   * Get changed files from git diff
   * @param {string} baseBranch - Base branch for comparison (default: 'main')
   * @returns {string[]} Array of changed file paths
   */
  getChangedFiles(baseBranch = 'main') {
    try {
      const cmd = `git diff ${baseBranch}...HEAD --name-only`;
      const output = execSync(cmd, { encoding: 'utf-8' });
      this.changedFiles = output
        .split('\n')
        .filter(file => file.trim().length > 0);
      return this.changedFiles;
    } catch (error) {
      console.warn('⚠️  Could not get changed files from git:', error.message);
      return [];
    }
  }

  /**
   * Filter tests by type
   * @param {string[]} testFiles - Array of test file paths
   * @param {string|string[]} testType - Test type(s) to filter by
   * @returns {string[]} Filtered test files
   */
  filterByTestType(testFiles, testType) {
    const types = Array.isArray(testType) ? testType : [testType];
    const patterns = types
      .map(t => TEST_TYPE_PATTERNS[t.toLowerCase()])
      .filter(Boolean);

    if (patterns.length === 0) {
      console.warn(`⚠️  No patterns found for test type(s): ${types.join(', ')}`);
      return testFiles;
    }

    return testFiles.filter(file =>
      patterns.some(pattern => pattern.test(file))
    );
  }

  /**
   * Filter tests based on changed files
   * @param {string[]} testFiles - Array of test files
   * @param {string[]} changedFiles - Array of changed files
   * @returns {string[]} Filtered test files related to changes
   */
  filterByChangedFiles(testFiles, changedFiles) {
    if (changedFiles.length === 0) {
      return [];
    }

    return testFiles.filter(testFile => {
      // Extract component/file name from test file
      const testName = path.basename(testFile)
        .replace(/\.test\.[jt]sx?$/, '')
        .replace(/\.(snapshot|integration|e2e|staging)\.test\.[jt]sx?$/, '');

      // Check if any changed file is related to this test
      return changedFiles.some(changedFile => {
        // Direct file match (same name in different directory)
        if (changedFile.includes(testName)) {
          return true;
        }

        // Check file mapping relationships
        for (const [srcPattern, components] of Object.entries(FILE_MAPPINGS)) {
          if (changedFile.includes(srcPattern)) {
            // If a component changed, run tests for that component
            return components.some(comp => testFile.includes(comp));
          }
        }

        return false;
      });
    });
  }

  /**
   * Get test file metadata (for sorting and reporting)
   * @param {string} testFile - Path to test file
   * @returns {Object} Test file metadata
   */
  getTestMetadata(testFile) {
    const fileName = path.basename(testFile);
    const metadata = {
      path: testFile,
      name: fileName,
      type: this.detectTestType(testFile),
      category: this.detectCategory(testFile),
      relativePath: testFile,
      size: fs.statSync(testFile).size,
    };

    return metadata;
  }

  /**
   * Detect test type from file name
   * @param {string} testFile - Test file path
   * @returns {string} Test type
   */
  detectTestType(testFile) {
    for (const [type, pattern] of Object.entries(TEST_TYPE_PATTERNS)) {
      if (pattern.test(testFile)) {
        return type;
      }
    }
    return 'unit';
  }

  /**
   * Detect test category
   * @param {string} testFile - Test file path
   * @returns {string} Test category
   */
  detectCategory(testFile) {
    if (testFile.includes('context')) return 'context';
    if (testFile.includes('components')) return 'components';
    if (testFile.includes('pages')) return 'pages';
    if (testFile.includes('hooks')) return 'hooks';
    if (testFile.includes('utils')) return 'utils';
    if (testFile.includes('services')) return 'services';
    return 'other';
  }

  /**
   * Sort tests by specified criteria
   * @param {string[]} testFiles - Array of test files
   * @param {string} sortBy - Sort criteria (name, type, size, category)
   * @param {string} order - Sort order (asc, desc)
   * @returns {string[]} Sorted test files
   */
  sortTests(testFiles, sortBy = 'name', order = 'asc') {
    const metadata = testFiles.map(file => this.getTestMetadata(file));
    
    metadata.sort((a, b) => {
      let comparison = 0;

      switch (sortBy.toLowerCase()) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return order.toLowerCase() === 'desc' ? -comparison : comparison;
    });

    return metadata.map(m => m.path);
  }

  /**
   * Generate smart test selection based on changes
   * @param {string} baseBranch - Base branch for comparison
   * @param {Object} options - Options object
   * @returns {Object} Smart test selection result
   */
  generateSmartTestSelection(baseBranch = 'main', options = {}) {
    const {
      includeSnapshots = true,
      includeIntegration = true,
      sort = 'category',
      verbose = false,
    } = options;

    try {
      // Get all test files
      const allTests = this.discoverTestFiles();
      if (allTests.length === 0) {
        return {
          success: false,
          message: 'No test files found',
          tests: [],
          count: 0,
        };
      }

      // Get changed files
      const changed = this.getChangedFiles(baseBranch);
      if (verbose) {
        console.log(`📝 Changed files: ${changed.length}`);
      }

      // Filter by changed files
      let relevantTests = this.filterByChangedFiles(allTests, changed);

      // If no direct matches, include some safety tests
      if (relevantTests.length === 0) {
        relevantTests = this.filterByTestType(allTests, 'unit');
      }

      // Exclude snapshot tests unless explicitly included
      if (!includeSnapshots) {
        relevantTests = relevantTests.filter(t => !t.includes('.snapshot.'));
      }

      // Exclude integration tests unless explicitly included
      if (!includeIntegration) {
        relevantTests = relevantTests.filter(t => !t.includes('.integration.'));
      }

      // Sort tests
      const sortedTests = this.sortTests(relevantTests, sort);

      if (verbose) {
        console.log(`✅ Selected ${sortedTests.length} tests for execution`);
        console.log('\n📋 Test Details:');
        sortedTests.forEach(test => {
          const meta = this.getTestMetadata(test);
          console.log(`  - ${meta.name} [${meta.type}] (${meta.category})`);
        });
      }

      return {
        success: true,
        message: `Selected ${sortedTests.length} tests for execution`,
        tests: sortedTests,
        count: sortedTests.length,
        metadata: {
          totalAvailable: allTests.length,
          changedFiles: changed.length,
          sortedBy: sort,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating smart test selection: ${error.message}`,
        tests: [],
        count: 0,
      };
    }
  }

  /**
   * Generate CI execution report
   * @param {string[]} testFiles - Array of test files
   * @param {Object} options - Report options
   * @returns {string} Formatted report
   */
  generateCIReport(testFiles, options = {}) {
    const { format = 'markdown' } = options;

    const groupedTests = {};
    testFiles.forEach(file => {
      const meta = this.getTestMetadata(file);
      if (!groupedTests[meta.type]) {
        groupedTests[meta.type] = [];
      }
      groupedTests[meta.type].push(meta);
    });

    if (format === 'markdown') {
      return this.generateMarkdownReport(groupedTests);
    } else if (format === 'json') {
      return JSON.stringify(groupedTests, null, 2);
    }

    return this.generateTextReport(groupedTests);
  }

  /**
   * Generate markdown formatted report
   * @private
   * @param {Object} groupedTests - Tests grouped by type
   * @returns {string} Markdown report
   */
  generateMarkdownReport(groupedTests) {
    let report = '# CI Pipeline Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `## Summary\n`;
    report += `- **Total Tests**: ${Object.values(groupedTests).flat().length}\n`;
    report += `- **Test Types**: ${Object.keys(groupedTests).length}\n\n`;

    for (const [type, tests] of Object.entries(groupedTests)) {
      report += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Tests (${tests.length})\n\n`;
      report += '| Test | Category | Size |\n';
      report += '| :--- | :--- | :--- |\n';
      
      tests.forEach(test => {
        const sizeKb = (test.size / 1024).toFixed(2);
        report += `| ${test.name} | ${test.category} | ${sizeKb} KB |\n`;
      });
      report += '\n';
    }

    return report;
  }

  /**
   * Generate text formatted report
   * @private
   * @param {Object} groupedTests - Tests grouped by type
   * @returns {string} Text report
   */
  generateTextReport(groupedTests) {
    let report = 'CI Pipeline Test Report\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `Summary:\n`;
    report += `- Total Tests: ${Object.values(groupedTests).flat().length}\n`;
    report += `- Test Types: ${Object.keys(groupedTests).length}\n\n`;

    for (const [type, tests] of Object.entries(groupedTests)) {
      report += `${type.toUpperCase()} Tests (${tests.length}):\n`;
      tests.forEach(test => {
        const sizeKb = (test.size / 1024).toFixed(2);
        report += `  - ${test.name} [${test.category}] ${sizeKb} KB\n`;
      });
      report += '\n';
    }

    return report;
  }
}

// CLI Interface
// Check if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const command = args[0];
  const utils = new CIPipelineUtils();

  switch (command) {
    case 'discover':
      {
        const tests = utils.discoverTestFiles();
        console.log(`📂 Discovered ${tests.length} test files:\n`);
        tests.forEach(test => console.log(`  - ${test}`));
      }
      break;

    case 'smart-select':
      {
        const baseBranch = args[1] || 'main';
        const verbose = args.includes('--verbose');
        const result = utils.generateSmartTestSelection(baseBranch, {
          verbose,
          includeSnapshots: !args.includes('--no-snapshots'),
          includeIntegration: !args.includes('--no-integration'),
          sort: args[2] || 'category',
        });

        if (!verbose) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('\n✨ Smart test selection completed');
          console.log(`Result: ${result.message}`);
        }
      }
      break;

    case 'filter':
      {
        const testType = args[1];
        if (!testType) {
          console.error('❌ Please specify a test type: unit, integration, snapshot, e2e');
          process.exit(1);
        }
        
        const tests = utils.discoverTestFiles();
        const filtered = utils.filterByTestType(tests, testType);
        console.log(`Filtered ${filtered.length} tests by type "${testType}":\n`);
        filtered.forEach(test => console.log(`  - ${test}`));
      }
      break;

    case 'sort':
      {
        const sortBy = args[1] || 'name';
        const order = args[2] || 'asc';
        const tests = utils.discoverTestFiles();
        const sorted = utils.sortTests(tests, sortBy, order);
        console.log(`Sorted tests by ${sortBy} (${order}):\n`);
        sorted.forEach(test => console.log(`  - ${test}`));
      }
      break;

    case 'report':
      {
        const format = args[1] || 'markdown';
        const tests = utils.discoverTestFiles();
        const report = utils.generateCIReport(tests, { format });
        console.log(report);
      }
      break;

    case 'changed':
      {
        const baseBranch = args[1] || 'main';
        const changed = utils.getChangedFiles(baseBranch);
        console.log(`Changed files relative to ${baseBranch}:\n`);
        changed.forEach(file => console.log(`  - ${file}`));
      }
      break;

    default:
      {
        console.log(`
🔧 CI Pipeline Utils - Advanced Filtering and Sorting

Usage: npm run ci:* <command> [options]

Commands:
  discover              Discover all test files in the project
  smart-select          Generate smart test selection based on changes
  filter <type>         Filter tests by type (unit, integration, snapshot, e2e)
  sort <criteria>       Sort tests by criteria (name, type, size, category)
  report [format]       Generate CI report (markdown, json, text)
  changed [branch]      Show changed files relative to a branch

Examples:
  node scripts/ci-pipeline-utils.js discover
  node scripts/ci-pipeline-utils.js smart-select main --verbose
  node scripts/ci-pipeline-utils.js filter unit
  node scripts/ci-pipeline-utils.js sort size desc
  node scripts/ci-pipeline-utils.js report json
        `);
      }
  }
}

export default CIPipelineUtils;
