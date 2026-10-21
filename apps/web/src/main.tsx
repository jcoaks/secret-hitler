import '@fontsource/germania-one/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/700.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { HomeScreen } from './screens/entry/Home';
import { RulesScreen } from './screens/entry/Rules';
import { RoomPage } from './screens/RoomPage';

const router = createBrowserRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '/sala/:code', element: <RoomPage /> },
  { path: '/reglas', element: <RulesScreen /> },
  { path: '*', element: <HomeScreen /> },
]);

const root = document.getElementById('root');
if (!root) throw new Error('Falta el elemento #root');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
