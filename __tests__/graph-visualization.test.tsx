import React from 'react';
import { render, screen } from '@testing-library/react';
import GraphVisualization from '../components/graph-visualization';

describe('GraphVisualization', () => {
  it('renders loading state', () => {
    render(<GraphVisualization data={null} settings={{}} isLoading={true} />);
    expect(screen.getByText('Generating graph...')).toBeInTheDocument();
  });

  it('renders no data state', () => {
    render(<GraphVisualization data={null} settings={{}} isLoading={false} />);
    expect(screen.getByText('No graph data available')).toBeInTheDocument();
  });
});
