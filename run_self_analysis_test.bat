@echo off
echo =============================================================
echo       FrontierAI Self-Analysis Module Test Suite
echo =============================================================
echo.

echo 🔍 Starting Enhanced Self-Analysis Test Suite...
echo.

echo 📊 Running Comprehensive Analysis Test...
python test_self_analysis.py

echo.
echo 🔗 Running Simulation Integration Test...
python test_simulation_integration.py

echo.
echo 📋 Test completed! Check the generated files:
echo    - analysis_report_*.md (Markdown format)
echo    - analysis_report_*.html (Web format - open in browser)
echo    - analysis_report_*.json (Data format)
echo    - improvement_proposals_*.json (Simulation proposals)
echo    - simulation_execution_plan_*.json (Execution plan)
echo.

echo Press any key to view the HTML report...
pause >nul

for %%f in (analysis_report_*.html) do (
    echo Opening %%f...
    start "" "%%f"
    goto :done
)

:done
echo.
echo Press any key to view the latest improvement proposals...
pause >nul

for %%f in (improvement_proposals_*.json) do (
    echo Opening %%f...
    start "" "%%f"
    goto :proposals_done
)

:proposals_done
echo.
echo ✅ Enhanced Self-Analysis Test Suite Complete!
echo 🎯 Features Tested:
echo    - Repository structure analysis
echo    - Code quality assessment  
echo    - Security vulnerability detection
echo    - Technical debt quantification
echo    - Improvement item generation
echo    - Multi-strategy prioritization
echo    - Detailed proposal creation
echo    - Simulation environment integration
echo    - Comprehensive reporting
pause
