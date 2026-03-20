/**
 * Quality Monitoring Interface
 * Real-time quality assessment and compliance monitoring
 */

import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

export const QualityMonitoringInterface: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Quality & Compliance Monitoring
      </Typography>
      
      <Alert severity="info">
        Quality monitoring engine is active and assessing call quality.
        Full monitoring dashboard interface is in development.
      </Alert>
    </Box>
  );
};

export default QualityMonitoringInterface;