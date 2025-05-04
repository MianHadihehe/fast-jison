#!/usr/bin/env node
/**
 * Main test runner for Jison refactored codebase
 *
 * Run with: node run-tests.js
 */

 const fs            = require('fs');
 const path          = require('path');
 const child_process = require('child_process');
 
 //
 // 1) Identify your project root from where you invoked `node run-tests.js`,
 //    and compute the absolute path to your CLI.
 //
 const ROOT_DIR = process.cwd();
 const CLI_PATH = path.join(ROOT_DIR, 'lib', 'cli.js');
 
 //
 // 2) Monkey-patch execSync so that any call to “node ../lib/cli.js”
 //    in the child tests is rewritten to use the absolute CLI_PATH
 //    and is always run from the project root.
 //
 const originalExecSync = child_process.execSync.bind(child_process);
 child_process.execSync = (command, options = {}) => {
   if (
     typeof command === 'string' &&
     command.trim().startsWith('node ../lib/cli.js')
   ) {
     // rewrite it to `node "/absolute/path/to/lib/cli.js"`
     command = command.replace(
       /^node \.\.\/lib\/cli\.js/,
       `node "${CLI_PATH}"`
     );
     // force the working directory back to project root
     options.cwd = ROOT_DIR;
   }
   return originalExecSync(command, options);
 };
 
 //
 // 3) Change into the tests folder so that relative requires inside
 //    your suites still work as expected.
 //
 process.chdir(path.join(ROOT_DIR, 'tests'));
 
 //
 // 4) Compute your output directories (absolute paths).
 //
 const TEST_DIR     = path.join(ROOT_DIR, 'test-output');
 const EXAMPLES_DIR = path.join(ROOT_DIR, 'test-grammars');
 const LIB_DIR      = path.resolve(ROOT_DIR, 'lib');
 
 //
 // 5) Ensure those folders exist.
 //
 if (!fs.existsSync(TEST_DIR)) {
   fs.mkdirSync(TEST_DIR, { recursive: true });
 }
 if (!fs.existsSync(EXAMPLES_DIR)) {
   fs.mkdirSync(EXAMPLES_DIR, { recursive: true });
 }
 
 //
 // 6) Seed the test grammars.
 //
 require(path.join(ROOT_DIR, 'tests', 'create-grammars'));
 
 //
 // 7) Define and run each suite, passing in your absolute paths.
 //
 const testSuites = [
   './basic-tests.js',
   './generator-tests.js',
   './parser-tests.js',
   './module-type-tests.js',
   './parser-type-tests.js',
   './error-tests.js',
   './integration-tests.js',
 ];
 
 console.log('Running Jison tests...\n');
 
 let totalTests  = 0;
 let totalPassed = 0;
 let totalFailed = 0;
 
 for (const suitePath of testSuites) {
   try {
     console.log(`\nRunning test suite: ${path.basename(suitePath)}`);
     const suite = require(path.join(ROOT_DIR, 'tests', suitePath));
     const { total, passed, failed } = suite.runTests({
       CLI_PATH,
       ROOT_DIR,
       TEST_DIR,
       EXAMPLES_DIR
     });
     totalTests  += total;
     totalPassed += passed;
     totalFailed += failed;
     console.log(`Suite results: ${passed}/${total} tests passed\n`);
   } catch (err) {
     console.error(`Error running ${suitePath}:`, err);
     totalFailed++;
   }
 }
 
 console.log('==============================================');
 console.log(`Final results: ${totalPassed}/${totalTests} tests passed`);
 console.log('==============================================');
 
 if (totalFailed > 0) {
   console.error(`Failed tests: ${totalFailed}`);
   process.exit(1);
 } else {
   console.log('All tests passed successfully!');
 }
 
 module.exports = {
   ROOT_DIR,
   LIB_DIR,
   CLI_PATH,
   TEST_DIR,
   EXAMPLES_DIR
 };