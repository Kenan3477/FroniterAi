// Quick diagnostic to check what error might be happening
console.log('\n🔍 DIAGNOSING CALL FAILURE\n');
console.log('Common causes:');
console.log('1. Active call check blocking (409 - call already in progress)');
console.log('2. Missing required fields (phone number, from number)');
console.log('3. Twilio credentials issue');
console.log('4. Recording parameters causing validation error');
console.log('5. Database connection issue');
console.log('\n💡 To diagnose, check:');
console.log('- Browser console for exact error message');
console.log('- Railway logs for backend error');
console.log('- Network tab to see request/response');
console.log('\nPlease provide the error message from browser console.\n');
