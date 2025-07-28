import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphSettings } from '@/lib/types/graph';

// Universal intra-cluster force variables
const INTRA_CLUSTER_STRENGTH = 0.3; // How strongly nodes in the same cluster repel each other
const INTRA_CLUSTER_RADIUS = 80;    // Minimum distance between nodes in the same cluster
const CLUSTER_KEY = 'cluster';      // Property name for cluster/group on node objects

// Settings constants
const REPULSION = -200;         // Base repulsion force
const LINK_STRENGTH = 1;      // Base link strength
const COLLISION_RADIUS = 50;    // Base collision radius
const LINK_DISTANCE = 50;       // Base link distance
const ALPHA_DECAY = 0.02;       // Base alpha decay

// Custom force for intra-cluster repulsion
function forceIntraCluster(strength = INTRA_CLUSTER_STRENGTH, radius = INTRA_CLUSTER_RADIUS, clusterKey = CLUSTER_KEY) {
  type IntraClusterNode = d3.SimulationNodeDatum & { [key: string]: any; x: number; y: number };
  let nodes: IntraClusterNode[] = [];
  function force() {
    for (let i = 0; i < nodes.length; ++i) {
      for (let j = i + 1; j < nodes.length; ++j) {
        const a = nodes[i];
        const b = nodes[j];
        if (a[clusterKey] !== undefined && b[clusterKey] !== undefined && a[clusterKey] === b[clusterKey]) {
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < radius) {
            let k = (radius - dist) / dist * strength;
            let mx = dx * k * 0.5;
            let my = dy * k * 0.5;
            a.x += mx;
            a.y += my;
            b.x -= mx;
            b.y -= my;
          }
        }
      }
    }
  }
  force.initialize = function(_nodes: d3.SimulationNodeDatum[]): void {
    nodes = _nodes as IntraClusterNode[];
  };
  return force;
}

export function useD3Graph(data: GraphData | null, settings: GraphSettings) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    console.log("useD3Graph received data:", data);
    if (!data || !svgRef.current) return;

    // Fix edges to have string IDs for source/target
    const cleanedEdges = data.edges.map(e => ({
      ...e,
      source: typeof e.source === "object" ? (e.source as any).id : e.source,
      target: typeof e.target === "object" ? (e.target as any).id : e.target,
    }));

    // Dynamically set logical plotting area based on node count (square)
    // Minimum size is the SVG's actual size, but grows with node count
    const baseSize = Math.max(svgRef.current.clientWidth, svgRef.current.clientHeight);
    const nodeCount = data.nodes.length;
    // Growth factor: tweak as needed for your graph density
    const growth = Math.sqrt(nodeCount) * 100; 
    const logicalSize = Math.max(baseSize, 300 + growth); // 300px minimum
    const width = logicalSize;
    const height = logicalSize;
    console.log(`Dynamic Logical Size: ${logicalSize} (for ${nodeCount} nodes)`);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Initial node spread
    const spread = Math.min(width, height) * 0.7;
    data.nodes.forEach((d: any, i: number) => {
      d.x = Math.max(0, Math.min(width, width / 2 + spread * (Math.random() - 0.5)));
      d.y = Math.max(0, Math.min(height, height / 2 + spread * (Math.random() - 0.5)));
    });

    // Create simulation based on layout type
    let simulation: d3.Simulation<any, any>;
    switch (settings.layout) {
      case 'kamada':
        simulation = d3
          .forceSimulation(data.nodes as d3.SimulationNodeDatum[])
          .force(
            'link',
            d3
              .forceLink(cleanedEdges as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[])
              .id((d: any) => d.id)
              .distance(LINK_DISTANCE * 1.0)
              .strength(LINK_STRENGTH * 2.0)
          )
          .force('charge', d3.forceManyBody().strength(REPULSION * 1.5))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(COLLISION_RADIUS * 0.8))
          .force('intraCluster', forceIntraCluster());
        break;
      case 'fruchterman':
        simulation = d3
          .forceSimulation(data.nodes as d3.SimulationNodeDatum[])
          .force(
            'link',
            d3
              .forceLink(cleanedEdges as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[])
              .id((d: any) => d.id)
              .distance(LINK_DISTANCE * 1.2)
              .strength(LINK_STRENGTH * 0.8)
          )
          .force('charge', d3.forceManyBody().strength(REPULSION * 2.0))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .alphaDecay(ALPHA_DECAY * 1.0)
          .force('intraCluster', forceIntraCluster());
        break;
      default: // spring
        simulation = d3
          .forceSimulation(data.nodes as d3.SimulationNodeDatum[])
          .force(
            'link',
            d3
              .forceLink(cleanedEdges as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[])
              .id((d: any) => d.id)
              .distance(LINK_DISTANCE * 1.0)
              .strength(LINK_STRENGTH * 1.0)
          )
          .force('charge', d3.forceManyBody().strength(REPULSION * 1.0))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(COLLISION_RADIUS * 1.0))
          .force('intraCluster', forceIntraCluster());
    }

    // Create zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom as any);
    const g = svg.append('g');

    // Create edges
    const link = g
      .append('g')
      .selectAll('line')
      .data(cleanedEdges)
      .enter()
      .append('line')
      .attr('stroke', '#8b5cf6')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.max(1, Math.min(8, d.weight / 2)));

    const node = g
      .append('g')
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('class', 'graph-node')
      .attr('tabindex', -1)
      .attr('r', (d: any) => Math.max(5, Math.sqrt(d.degree) * 3))
      .attr('fill', (d: any, i: number) => d3.schemeCategory10[i % 10])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended) as any);

    let labels: any;
    if (settings.showLabels) {
      labels = g
        .append('g')
        .selectAll('text')
        .data(data.nodes)
        .enter()
        .append('text')
        .text((d: any) => d.name)
        .attr('font-size', '10px')
        .attr('dx', 12)
        .attr('dy', 4);
    }

    let edgeLabels: any;
    if (settings.showWeights) {
      edgeLabels = g
        .append('g')
        .selectAll('text')
        .data(cleanedEdges)
        .enter()
        .append('text')
        .text((d: any) => d.weight)
        .attr('font-size', '8px')
        .attr('fill', '#666')
        .attr('text-anchor', 'middle');
    }

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

      // Clamp node positions to visible SVG area
      data.nodes.forEach((d: any) => {
        d.x = Math.max(0, Math.min(width, d.x));
        d.y = Math.max(0, Math.min(height, d.y));
      });

      if (labels) {
        labels.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
      }

      if (edgeLabels) {
        edgeLabels
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2);
      }
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return svgRef;
}
