/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { ResearchAgent } from './pages/ResearchAgent';
import { ProductAgent } from './pages/ProductAgent';
import { TechnicalAgent } from './pages/TechnicalAgent';
import { CriticAgent } from './pages/CriticAgent';
import { FinalReport } from './pages/FinalReport';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/research" element={<ResearchAgent />} />
        <Route path="/product" element={<ProductAgent />} />
        <Route path="/technical" element={<TechnicalAgent />} />
        <Route path="/critic" element={<CriticAgent />} />
        <Route path="/report" element={<FinalReport />} />
      </Routes>
    </BrowserRouter>
  );
}
