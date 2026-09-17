import { createRoot } from 'react-dom/client';
import { AtlasApp } from './components/atlas-app';
import '@patternfly/react-core/dist/styles/base.css';
import './globals.css';

createRoot(document.getElementById('root')!).render(<AtlasApp />);
