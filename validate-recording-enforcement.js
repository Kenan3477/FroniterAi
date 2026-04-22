/**
 * 🎙️ CALL RECORDING ENFORCEMENT VALIDATOR
 * 
 * This script validates that call recording is properly configured
 * and CANNOT be disabled. Run before any deployment that touches call logic.
 * 
 * CRITICAL: This validation MUST pass before deploying to production.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log('\n' + BOLD + '🎙️  CALL RECORDING ENFORCEMENT VALIDATOR' + RESET);
console.log('═══════════════════════════════════════════════════════════════\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

function pass(message) {
  console.log(GREEN + '✅ PASS:' + RESET + ' ' + message);
  passedChecks++;
  totalChecks++;
}

function fail(message) {
  console.log(RED + '❌ FAIL:' + RESET + ' ' + message);
  failedChecks++;
  totalChecks++;
}

function warn(message) {
  console.log(YELLOW + '⚠️  WARN:' + RESET + ' ' + message);
  warnings++;
}

function info(message) {
  console.log(BLUE + 'ℹ️  INFO:' + RESET + ' ' + message);
}

function section(title) {
  console.log('\n' + BOLD + title + RESET);
  console.log('───────────────────────────────────────────────────────────────');
}

// ═══════════════════════════════════════════════════════════════
// CHECK 1: Dialer Controller Recording Parameters
// ═══════════════════════════════════════════════════════════════
section('1️⃣  Checking dialerController.ts Recording Parameters');

const dialerControllerPath = path.join(__dirname, 'backend/src/controllers/dialerController.ts');
if (!fs.existsSync(dialerControllerPath)) {
  fail('dialerController.ts not found at: ' + dialerControllerPath);
} else {
  const content = fs.readFileSync(dialerControllerPath, 'utf8');
  
  // Check for call-level recording parameters
  const hasRecordParam = content.includes("record: 'record-from-answer-dual'");
  const hasRecordingCallback = content.includes('recordingStatusCallback');
  const hasRecordingChannels = content.includes("recordingChannels: 'dual'");
  const hasRecordingStatusEvent = content.includes("recordingStatusCallbackEvent");
  
  if (hasRecordParam) {
    pass("Found 'record: record-from-answer-dual' parameter");
  } else {
    fail("Missing 'record: record-from-answer-dual' parameter in dialerController.ts");
  }
  
  if (hasRecordingCallback) {
    pass("Found 'recordingStatusCallback' parameter");
  } else {
    fail("Missing 'recordingStatusCallback' parameter in dialerController.ts");
  }
  
  if (hasRecordingChannels) {
    pass("Found 'recordingChannels: dual' parameter");
  } else {
    fail("Missing 'recordingChannels: dual' parameter in dialerController.ts");
  }
  
  if (hasRecordingStatusEvent) {
    pass("Found 'recordingStatusCallbackEvent' parameter");
  } else {
    fail("Missing 'recordingStatusCallbackEvent' parameter in dialerController.ts");
  }
  
  // Check for forbidden patterns
  const hasCommentedRecording = content.match(/\/\/.*record.*record-from-answer/i);
  if (hasCommentedRecording) {
    fail("Found COMMENTED OUT recording parameter - THIS IS FORBIDDEN!");
    console.log(RED + '   Line: ' + hasCommentedRecording[0] + RESET);
  } else {
    pass("No commented-out recording parameters found");
  }
  
  // Check for conditional recording
  const hasConditionalRecording = content.match(/\.\.\.\(.*&&.*record.*\)/i);
  if (hasConditionalRecording) {
    fail("Found CONDITIONAL recording parameter - Recording must be UNCONDITIONAL!");
  } else {
    pass("No conditional recording logic found");
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECK 2: TwiML Service Recording Configuration
// ═══════════════════════════════════════════════════════════════
section('2️⃣  Checking twilioService.ts TwiML Recording');

const twilioServicePath = path.join(__dirname, 'backend/src/services/twilioService.ts');
if (!fs.existsSync(twilioServicePath)) {
  fail('twilioService.ts not found at: ' + twilioServicePath);
} else {
  const content = fs.readFileSync(twilioServicePath, 'utf8');
  
  // Check for TwiML recording in Dial verb
  const hasTwiMLRecording = content.includes("record: 'record-from-answer");
  const hasTwiMLCallback = content.includes('recordingStatusCallback');
  
  if (hasTwiMLRecording) {
    pass("Found TwiML recording parameter in Dial verb");
  } else {
    fail("Missing TwiML recording parameter in twilioService.ts");
  }
  
  if (hasTwiMLCallback) {
    pass("Found TwiML recordingStatusCallback");
  } else {
    warn("Missing TwiML recordingStatusCallback (call-level should be sufficient)");
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECK 3: Database Schema
// ═══════════════════════════════════════════════════════════════
section('3️⃣  Checking Database Schema');

const schemaPath = path.join(__dirname, 'backend/prisma/schema.prisma');
if (!fs.existsSync(schemaPath)) {
  fail('schema.prisma not found at: ' + schemaPath);
} else {
  const content = fs.readFileSync(schemaPath, 'utf8');
  
  // Find CallRecord model
  const callRecordMatch = content.match(/model CallRecord \{[\s\S]*?\}/);
  if (callRecordMatch) {
    const callRecordModel = callRecordMatch[0];
    
    // Check for recording column
    if (callRecordModel.includes('recording')) {
      pass("Found 'recording' column in CallRecord model");
      
      // Check if it's nullable (it should be String? for flexibility)
      if (callRecordModel.match(/recording\s+String\?/)) {
        pass("Recording column is properly typed as String?");
      } else {
        warn("Recording column type might not be optimal");
      }
    } else {
      fail("Missing 'recording' column in CallRecord model");
    }
  } else {
    fail("Could not find CallRecord model in schema.prisma");
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECK 4: Recording Callback Route
// ═══════════════════════════════════════════════════════════════
section('4️⃣  Checking Recording Callback Route');

const dialerRoutesPath = path.join(__dirname, 'backend/src/routes/dialer.ts');
if (!fs.existsSync(dialerRoutesPath)) {
  warn('dialer.ts routes file not found, checking dialerController.ts for callback handler');
  
  const dialerControllerPath = path.join(__dirname, 'backend/src/controllers/dialerController.ts');
  if (fs.existsSync(dialerControllerPath)) {
    const content = fs.readFileSync(dialerControllerPath, 'utf8');
    
    if (content.includes('recording-callback') || content.includes('recordingCallback')) {
      pass("Found recording callback handler in dialerController.ts");
    } else {
      fail("Missing recording callback handler");
    }
  }
} else {
  const content = fs.readFileSync(dialerRoutesPath, 'utf8');
  
  if (content.includes('recording-callback') || content.includes('recordingCallback')) {
    pass("Found recording-callback route");
  } else {
    fail("Missing recording-callback route in dialer.ts");
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECK 5: Auto-Dialer Recording (if exists)
// ═══════════════════════════════════════════════════════════════
section('5️⃣  Checking Auto-Dialer Recording Configuration');

const autoDialerPath = path.join(__dirname, 'backend/src/services/autoDialEngine.ts');
if (!fs.existsSync(autoDialerPath)) {
  info("Auto-dialer not found (optional)");
} else {
  const content = fs.readFileSync(autoDialerPath, 'utf8');
  
  if (content.includes("record: 'record-from-answer")) {
    pass("Auto-dialer has recording parameters");
  } else {
    warn("Auto-dialer might be missing recording parameters");
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECK 6: Documentation Exists
// ═══════════════════════════════════════════════════════════════
section('6️⃣  Checking Documentation');

const docPath = path.join(__dirname, 'CALL_RECORDING_MANDATORY_RULE.md');
if (fs.existsSync(docPath)) {
  pass("Found CALL_RECORDING_MANDATORY_RULE.md documentation");
} else {
  fail("Missing CALL_RECORDING_MANDATORY_RULE.md documentation");
}

// ═══════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════
console.log('\n' + BOLD + '═══════════════════════════════════════════════════════════════' + RESET);
console.log(BOLD + '📊 VALIDATION SUMMARY' + RESET);
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Total Checks:   ' + totalChecks);
console.log(GREEN + 'Passed:         ' + passedChecks + RESET);
console.log(RED + 'Failed:         ' + failedChecks + RESET);
console.log(YELLOW + 'Warnings:       ' + warnings + RESET);

console.log('\n' + BOLD + '═══════════════════════════════════════════════════════════════' + RESET + '\n');

if (failedChecks === 0) {
  console.log(GREEN + BOLD + '✅ VALIDATION PASSED!' + RESET);
  console.log(GREEN + '   Call recording is properly enforced.' + RESET);
  console.log(GREEN + '   Safe to deploy.' + RESET + '\n');
  process.exit(0);
} else {
  console.log(RED + BOLD + '❌ VALIDATION FAILED!' + RESET);
  console.log(RED + '   Call recording enforcement is BROKEN.' + RESET);
  console.log(RED + '   DO NOT DEPLOY until all checks pass.' + RESET);
  console.log(RED + '   Review CALL_RECORDING_MANDATORY_RULE.md for correct implementation.' + RESET + '\n');
  process.exit(1);
}
