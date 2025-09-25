# UI/UX Design Framework

## 1. Design Principles

### Core Design Philosophy
- **Simplicity First**: Minimal learning curve for SMEs with limited technical expertise
- **Mobile-First**: Responsive design optimized for smartphones and tablets
- **Accessibility**: WCAG 2.1 AA compliance for inclusive design
- **Localization**: Multi-language support with RTL language compatibility
- **Progressive Enhancement**: Core functionality works without JavaScript

### Visual Design System
- **Color Palette**: Professional blues and greens with high contrast ratios
- **Typography**: System fonts for performance, clear hierarchy
- **Iconography**: Consistent icon set with intuitive meanings
- **Spacing**: 8px grid system for consistent layouts
- **Components**: Reusable component library for consistency

## 2. User Journey Maps

### SME Onboarding Journey
```
Registration → KYC/Compliance → Wallet Setup → First Product → Dashboard Training
     ↓              ↓               ↓              ↓               ↓
Basic Info → Document Upload → MetaMask Connect → Product Creation → Tutorial
```

#### Detailed SME Onboarding Flow
1. **Landing Page**
   - Value proposition clear and simple
   - Pricing tiers prominently displayed
   - "Start Free Trial" CTA button
   - Social proof and testimonials

2. **Registration Form**
   - Company information collection
   - Industry selection dropdown
   - Company size selection
   - Email verification

3. **KYC/Compliance Setup**
   - Document upload interface
   - Compliance checklist
   - Regional regulation selection
   - Progress indicator

4. **Wallet Integration**
   - Step-by-step MetaMask setup guide
   - Alternative wallet options
   - Test transaction to verify setup
   - Security best practices education

5. **First Product Creation**
   - Guided product registration wizard
   - Template selection based on industry
   - Batch information input
   - QR code generation

6. **Dashboard Training**
   - Interactive tutorial overlay
   - Feature walkthrough
   - Sample data demonstration
   - Help documentation links

### Consumer Verification Journey
```
QR Scan → Product Info → Authentication → Supply Chain → Feedback
    ↓         ↓            ↓              ↓            ↓
Mobile → Product Details → Blockchain → Full History → Rating
```

#### Detailed Consumer Verification Flow
1. **QR Code Scan**
   - Camera permission request
   - Scan animation and feedback
   - Error handling for invalid codes
   - Alternative manual entry option

2. **Product Information Display**
   - Product name and image
   - Manufacturing details
   - Expiry date (if applicable)
   - Authenticity status badge

3. **Blockchain Verification**
   - Loading animation during verification
   - Verification progress indicator
   - Success/failure feedback
   - Blockchain transaction details

4. **Supply Chain Timeline**
   - Interactive timeline visualization
   - Location markers on map
   - Temperature/humidity logs
   - Stakeholder information

5. **Feedback and Rating**
   - Simple star rating system
   - Optional text feedback
   - Report issue functionality
   - Social sharing options

## 3. Wireframes and Interface Design

### B2B Dashboard Layout

#### Main Dashboard
```
┌─────────────────────────────────────────────────────────┐
│  Logo    Navigation    User Profile    Notifications    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Products  │  │  Analytics  │  │ Compliance  │     │
│  │     142     │  │   85% Pass  │  │    100%     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Recent Activity                        │ │
│  │  • Product ABC123 shipped to Warehouse B           │ │
│  │  • Compliance check completed for Batch XYZ        │ │
│  │  • New stakeholder added to Product DEF456         │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Supply Chain Map                       │ │
│  │  [Interactive map showing product locations]        │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Product Management Interface
```
┌─────────────────────────────────────────────────────────┐
│  Products > Add New Product                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Product Information                                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Product Name: [________________]                    │ │
│  │ Product Type: [Pharmaceutical ▼]                    │ │
│  │ Batch Number: [________________]                    │ │
│  │ Manufacture Date: [____/____/____]                  │ │
│  │ Expiry Date: [____/____/____]                       │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  Raw Materials                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ [+ Add Material]                                    │ │
│  │ • Active Ingredient A - 50mg                        │ │
│  │ • Inactive Ingredient B - 100mg                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  Compliance Requirements                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ☑ FDA Manufacturing Standards                       │ │
│  │ ☑ Good Manufacturing Practices                      │ │
│  │ ☐ HIPAA Data Protection                             │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  [Cancel]                    [Create Product]           │
└─────────────────────────────────────────────────────────┘
```

#### Supply Chain Visualization
```
┌─────────────────────────────────────────────────────────┐
│  Product: ABC123 - Aspirin 100mg                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Timeline View                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 2024-01-15  Manufacturer  [●] Production Started    │ │
│  │ 2024-01-16  Manufacturer  [●] Quality Control       │ │
│  │ 2024-01-17  Manufacturer  [●] Packaging Complete    │ │
│  │ 2024-01-18  Distributor   [●] Received at Warehouse │ │
│  │ 2024-01-19  Distributor   [●] Quality Inspection    │ │
│  │ 2024-01-20  Retailer      [●] Delivered to Store    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  Map View                                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  [Interactive map with location pins]               │ │
│  │  📍 Manufacturing Plant - New York                  │ │
│  │  📍 Distribution Center - Chicago                   │ │
│  │  📍 Retail Store - Los Angeles                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  Environmental Data                                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Temperature: 2-8°C ✓  Humidity: 45-65% ✓          │ │
│  │ Light Exposure: Minimal ✓  Vibration: Low ✓        │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Consumer Verification Interface

#### Mobile Verification Page
```
┌─────────────────────────────────────────────────────────┐
│  [Scan QR Code]                                         │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  [QR Code Scanner View]                             │ │
│  │  Position QR code within the frame                  │ │
│  │                                                     │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │                                                 │ │ │
│  │  │              [Camera View]                      │ │ │
│  │  │                                                 │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  [Enter Code Manually]                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Product Verification Results
```
┌─────────────────────────────────────────────────────────┐
│  ✓ Authentic Product Verified                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  [Product Image]                                    │ │
│  │  Aspirin 100mg                                      │ │
│  │  Batch: ABC123                                      │ │
│  │  Manufactured: Jan 15, 2024                        │ │
│  │  Expires: Jan 15, 2026                             │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  Supply Chain Journey                                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  🏭 Manufacturer: PharmaCorp                        │ │
│  │  📦 Distributor: MedSupply Inc                      │ │
│  │  🏪 Retailer: HealthPlus Pharmacy                   │ │
│  │                                                     │ │
│  │  Journey Time: 5 days                               │ │
│  │  Temperature Range: 2-8°C ✓                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  [View Full History]  [Rate Product]  [Share]          │
└─────────────────────────────────────────────────────────┘
```

## 4. Component Library

### Primary Components

#### Button Component
```jsx
// Button.jsx
import React from 'react';
import { Button as MuiButton } from '@mui/material';

const Button = ({ 
  variant = 'primary', 
  size = 'medium', 
  loading = false,
  disabled = false,
  children,
  ...props 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#1976d2',
          color: 'white',
          '&:hover': { backgroundColor: '#1565c0' }
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          color: '#1976d2',
          border: '1px solid #1976d2',
          '&:hover': { backgroundColor: '#f3f4f6' }
        };
      case 'success':
        return {
          backgroundColor: '#2e7d32',
          color: 'white',
          '&:hover': { backgroundColor: '#1b5e20' }
        };
      default:
        return {};
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { padding: '6px 16px', fontSize: '0.875rem' };
      case 'large':
        return { padding: '12px 24px', fontSize: '1.125rem' };
      default:
        return { padding: '8px 20px', fontSize: '1rem' };
    }
  };

  return (
    <MuiButton
      disabled={disabled || loading}
      sx={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        textTransform: 'none',
        borderRadius: '8px',
        fontWeight: 500,
        ...props.sx
      }}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </MuiButton>
  );
};

export default Button;
```

#### Product Card Component
```jsx
// ProductCard.jsx
import React from 'react';
import { Card, CardContent, CardMedia, Typography, Chip, Box } from '@mui/material';
import { CheckCircle, Warning, Error } from '@mui/icons-material';

const ProductCard = ({ product, onClick }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle color="success" fontSize="small" />;
      case 'warning':
        return <Warning color="warning" fontSize="small" />;
      case 'error':
        return <Error color="error" fontSize="small" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' }
      }}
      onClick={onClick}
    >
      <CardMedia
        component="img"
        height="200"
        image={product.image || '/placeholder-product.jpg'}
        alt={product.name}
      />
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" component="h3" noWrap>
            {product.name}
          </Typography>
          {getStatusIcon(product.status)}
        </Box>
        
        <Typography variant="body2" color="text.secondary" mb={2}>
          Batch: {product.batchNumber}
        </Typography>
        
        <Box display="flex" gap={1} mb={2}>
          <Chip 
            label={product.type} 
            size="small" 
            color={getStatusColor(product.status)}
          />
          <Chip 
            label={product.stage} 
            size="small" 
            variant="outlined"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Last Update: {new Date(product.lastUpdate).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
```

#### Timeline Component
```jsx
// Timeline.jsx
import React from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot } from '@mui/lab';

const SupplyChainTimeline = ({ checkpoints }) => {
  const getTimelineColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'primary';
      case 'pending':
        return 'grey';
      default:
        return 'grey';
    }
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'manufactured':
        return '🏭';
      case 'shipped':
        return '🚚';
      case 'received':
        return '📦';
      case 'sold':
        return '🛒';
      default:
        return '📍';
    }
  };

  return (
    <Timeline>
      {checkpoints.map((checkpoint, index) => (
        <TimelineItem key={index}>
          <TimelineSeparator>
            <TimelineDot color={getTimelineColor(checkpoint.status)}>
              {getStatusIcon(checkpoint.type)}
            </TimelineDot>
            {index < checkpoints.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent>
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" component="h4">
                    {checkpoint.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {checkpoint.location}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(checkpoint.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {checkpoint.stakeholder.charAt(0).toUpperCase()}
                </Avatar>
              </Box>
              
              {checkpoint.additionalData && (
                <Box mt={1}>
                  <Typography variant="body2">
                    {checkpoint.additionalData}
                  </Typography>
                </Box>
              )}
              
              {checkpoint.environmentalData && (
                <Box mt={1} display="flex" gap={2}>
                  <Typography variant="caption">
                    🌡️ {checkpoint.environmentalData.temperature}
                  </Typography>
                  <Typography variant="caption">
                    💧 {checkpoint.environmentalData.humidity}
                  </Typography>
                </Box>
              )}
            </Paper>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
};

export default SupplyChainTimeline;
```

### Form Components

#### Product Registration Form
```jsx
// ProductRegistrationForm.jsx
import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Chip,
  OutlinedInput,
  Stepper,
  Step,
  StepLabel,
  Typography
} from '@mui/material';

const ProductRegistrationForm = ({ onSubmit }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    batchNumber: '',
    manufactureDate: '',
    expiryDate: '',
    rawMaterials: [],
    complianceRequirements: []
  });

  const steps = ['Basic Information', 'Raw Materials', 'Compliance', 'Review'];

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleRawMaterialAdd = (material) => {
    if (material.trim() && !formData.rawMaterials.includes(material.trim())) {
      setFormData(prev => ({
        ...prev,
        rawMaterials: [...prev.rawMaterials, material.trim()]
      }));
    }
  };

  const handleRawMaterialDelete = (materialToDelete) => {
    setFormData(prev => ({
      ...prev,
      rawMaterials: prev.rawMaterials.filter(material => material !== materialToDelete)
    }));
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Product Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Product Type</InputLabel>
              <Select
                value={formData.type}
                onChange={handleInputChange('type')}
                label="Product Type"
              >
                <MenuItem value="pharmaceutical">Pharmaceutical</MenuItem>
                <MenuItem value="luxury">Luxury Goods</MenuItem>
                <MenuItem value="electronics">Electronics</MenuItem>
                <MenuItem value="food">Food & Beverage</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Batch Number"
              value={formData.batchNumber}
              onChange={handleInputChange('batchNumber')}
              margin="normal"
            />
          </Box>
        );
      
      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Add Raw Material"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleRawMaterialAdd(e.target.value);
                  e.target.value = '';
                }
              }}
              margin="normal"
            />
            <Box sx={{ mt: 2 }}>
              {formData.rawMaterials.map((material) => (
                <Chip
                  key={material}
                  label={material}
                  onDelete={() => handleRawMaterialDelete(material)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </Box>
        );
      
      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Compliance Requirements
            </Typography>
            {/* Compliance checklist would go here */}
          </Box>
        );
      
      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review Product Information
            </Typography>
            {/* Review form data */}
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {renderStepContent(activeStep)}
      
      <Box sx={{ display: 'flex', pt: 2 }}>
        <Button
          color="inherit"
          disabled={activeStep === 0}
          onClick={() => setActiveStep(activeStep - 1)}
          sx={{ mr: 1 }}
        >
          Back
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          onClick={() => {
            if (activeStep === steps.length - 1) {
              onSubmit(formData);
            } else {
              setActiveStep(activeStep + 1);
            }
          }}
        >
          {activeStep === steps.length - 1 ? 'Create Product' : 'Next'}
        </Button>
      </Box>
    </Box>
  );
};

export default ProductRegistrationForm;
```

## 5. Responsive Design System

### Breakpoints
```javascript
// theme.js
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
};

const theme = createTheme({
  breakpoints,
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '16px',
          paddingRight: '16px',
          '@media (min-width:600px)': {
            paddingLeft: '24px',
            paddingRight: '24px',
          },
        },
      },
    },
  },
});
```

### Mobile-First CSS Approach
```css
/* Mobile styles (default) */
.product-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 16px;
}

/* Tablet styles */
@media (min-width: 600px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    padding: 24px;
  }
}

/* Desktop styles */
@media (min-width: 900px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    padding: 32px;
  }
}

/* Large desktop styles */
@media (min-width: 1200px) {
  .product-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

## 6. Accessibility Features

### ARIA Implementation
```jsx
// AccessibleButton.jsx
const AccessibleButton = ({ children, onClick, disabled, loading, ...props }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={loading ? "Loading, please wait" : undefined}
      aria-describedby={props['aria-describedby']}
      {...props}
    >
      {loading && (
        <span className="sr-only">Loading</span>
      )}
      {children}
    </button>
  );
};
```

### Screen Reader Support
```jsx
// ScreenReaderText.jsx
const ScreenReaderText = ({ children }) => (
  <span 
    style={{
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0
    }}
  >
    {children}
  </span>
);
```

### Keyboard Navigation
```jsx
// KeyboardNavigation.jsx
const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // ESC key to close modals
      if (event.key === 'Escape') {
        // Close modal logic
      }
      
      // Tab navigation enhancement
      if (event.key === 'Tab') {
        // Custom tab order logic
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

## 7. Performance Optimization

### Code Splitting
```jsx
// App.jsx
import React, { Suspense, lazy } from 'react';

const Dashboard = lazy(() => import('./components/Dashboard'));
const ProductManagement = lazy(() => import('./components/ProductManagement'));
const Analytics = lazy(() => import('./components/Analytics'));

const App = () => {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </Router>
  );
};
```

### Image Optimization
```jsx
// OptimizedImage.jsx
import React from 'react';

const OptimizedImage = ({ src, alt, ...props }) => {
  const [imageSrc, setImageSrc] = useState('/placeholder.jpg');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
    };
    img.src = src;
  }, [src]);

  return (
    <div className="image-container">
      {loading && <div className="image-skeleton" />}
      <img
        src={imageSrc}
        alt={alt}
        style={{ display: loading ? 'none' : 'block' }}
        {...props}
      />
    </div>
  );
};
```

## 8. Localization Support

### i18n Configuration
```javascript
// i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "product.name": "Product Name",
      "product.type": "Product Type",
      "product.batch": "Batch Number",
      "button.create": "Create Product",
      "button.cancel": "Cancel",
      "navigation.dashboard": "Dashboard",
      "navigation.products": "Products",
      "navigation.analytics": "Analytics"
    }
  },
  es: {
    translation: {
      "product.name": "Nombre del Producto",
      "product.type": "Tipo de Producto",
      "product.batch": "Número de Lote",
      "button.create": "Crear Producto",
      "button.cancel": "Cancelar",
      "navigation.dashboard": "Panel de Control",
      "navigation.products": "Productos",
      "navigation.analytics": "Análisis"
    }
  },
  zh: {
    translation: {
      "product.name": "产品名称",
      "product.type": "产品类型",
      "product.batch": "批次号",
      "button.create": "创建产品",
      "button.cancel": "取消",
      "navigation.dashboard": "仪表板",
      "navigation.products": "产品",
      "navigation.analytics": "分析"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

### RTL Support
```css
/* RTL Support */
[dir="rtl"] .timeline {
  direction: rtl;
}

[dir="rtl"] .timeline-item {
  text-align: right;
}

[dir="rtl"] .form-field {
  text-align: right;
}

/* Arabic font support */
.arabic-text {
  font-family: 'Cairo', 'Arial', sans-serif;
  direction: rtl;
}
```

This comprehensive UI/UX design framework provides a solid foundation for creating an intuitive, accessible, and scalable user interface for the decentralized traceability platform, with particular attention to the needs of SMEs in emerging markets.
