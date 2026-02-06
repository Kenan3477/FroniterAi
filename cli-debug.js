// Debug script to check CLI component rendering
console.log("🔍 CLI Debug Information");
console.log("Current URL:", window.location.href);
console.log("Environment:", process.env.NODE_ENV);
console.log("Reports page loaded:", !!document.querySelector('[data-testid="reports-page"]'));

// Check if CLIManagement component exists
const checkCLI = () => {
  const cliElements = document.querySelector('h2');
  if (cliElements) {
    console.log("Found h2 elements:", cliElements.textContent);
  }
  
  // Check for CLI specific content
  const cliContent = document.body.textContent;
  if (cliContent.includes('Call Line Identification')) {
    console.log("✅ CLI component is rendering");
  } else {
    console.log("❌ CLI component not found");
    console.log("Current page content includes:", 
      cliContent.includes('Reports') ? 'Reports' : 'Unknown',
      cliContent.includes('Voice') ? 'Voice' : 'No Voice',
      cliContent.includes('CLI') ? 'CLI' : 'No CLI'
    );
  }
};

// Run check after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkCLI);
} else {
  checkCLI();
}