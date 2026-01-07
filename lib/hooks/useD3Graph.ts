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

export function useD3Graph(data: GraphData | null, settings: GraphSettings, viewportKey: number = 0) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Note: keep behavior identical; only typing/lint fixes.
     if (!data || !svgRef.current) return;

  // Fix edges to have string IDs for source/target
  const cleanedEdges = data.edges.map(e => ({
      ...e,
      source: typeof e.source === "object" ? (e.source as any).id : e.source,
      target: typeof e.target === "object" ? (e.target as any).id : e.target,
    }));

  // Local aliases with permissive typing to keep behavior and silence TS
  const nodes = (data as GraphData).nodes as any[];
  const edges = cleanedEdges as any[];

    // Find the special artist node
  const specialArtist = nodes.find((n: any) => n.isSpecial) as any | undefined;

    // Determine if we're in degree-n connections mode (special artist present)
    const isDegreeMode = !!specialArtist;

    // Use actual container size to respect aspect ratio (e.g., 1:2 from wrapper)
    const containerWidth = svgRef.current.clientWidth || 800;
    const containerHeight = svgRef.current.clientHeight || Math.round(containerWidth * 2);
    const width = containerWidth;
    const height = containerHeight;

  const svg = d3.select(svgRef.current);
  svg.attr('width', width).attr('height', height);
  svg.attr('viewBox', `0 0 ${width} ${height}`);
  svg.selectAll('*').remove();

    // Root group before zoom to avoid "used before declared"
    const g = svg.append('g');
 
  // Initial node spread
  const spread = Math.min(width, height) * 0.7;
  nodes.forEach((d: any) => {
       d.x = Math.max(0, Math.min(width, width / 2 + spread * (Math.random() - 0.5)));
       d.y = Math.max(0, Math.min(height, height / 2 + spread * (Math.random() - 0.5)));
     });
 
    // Calculate degree from special node for each node (if degree mode)
    // Assume backend provides d.degreeFromSpecial for each node in degree mode

    // Custom repulsion and link strength functions
    function getRepulsion(d: any) {
      if (isDegreeMode && typeof d.degreeFromSpecial === 'number') {
        // Logarithmic growth: repulsion = base * (1 + scalar * log(degreeFromSpecial+1))
        const scalar = 1.5; // tweak as needed
        return REPULSION * (1 + scalar * Math.log(d.degreeFromSpecial + 1));
      }
      return REPULSION;
    }
  function getLinkStrength(link: any) {
      if (isDegreeMode) {
        // Weaken link strength based on furthest degree of source/target
    const degSource = typeof link.source === 'object' ? link.source.degreeFromSpecial : nodes.find((n: any) => n.id === link.source)?.degreeFromSpecial;
    const degTarget = typeof link.target === 'object' ? link.target.degreeFromSpecial : nodes.find((n: any) => n.id === link.target)?.degreeFromSpecial;
        const maxDeg = Math.max(degSource ?? 1, degTarget ?? 1);
        // Logarithmic decay: strength = base / (1 + scalar * log(maxDeg+1))
        const scalar = 1.2; // tweak as needed
        return LINK_STRENGTH / (1 + scalar * Math.log(maxDeg + 1));
      }
      return LINK_STRENGTH;
    }

    // Create simulation based on layout type
  let simulation: d3.Simulation<any, any>;
    switch (settings.layout) {
      case 'kamada':
        simulation = d3
      .forceSimulation(nodes as unknown as d3.SimulationNodeDatum[])
          .force(
            'link',
            d3
        .forceLink(edges as unknown as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[])
              .id((d: any) => d.id)
              .distance(LINK_DISTANCE * 1.0)
              .strength((d: any) => getLinkStrength(d) * 2.0)
          )
          .force('charge', d3.forceManyBody().strength((d: any) => getRepulsion(d) * 1.5))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(COLLISION_RADIUS * 0.8))
          .force('intraCluster', forceIntraCluster());
        break;
      case 'fruchterman':
        simulation = d3
      .forceSimulation(nodes as unknown as d3.SimulationNodeDatum[])
          .force(
            'link',
            d3
        .forceLink(edges as unknown as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[])
              .id((d: any) => d.id)
              .distance(LINK_DISTANCE * 1.2)
              .strength((d: any) => getLinkStrength(d) * 0.8)
          )
          .force('charge', d3.forceManyBody().strength((d: any) => getRepulsion(d) * 2.0))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .alphaDecay(ALPHA_DECAY * 1.0)
          .force('intraCluster', forceIntraCluster());
        break;
      default: // spring
        simulation = d3
      .forceSimulation(nodes as unknown as d3.SimulationNodeDatum[])
          .force(
            'link',
            d3
        .forceLink(edges as unknown as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[])
              .id((d: any) => d.id)
              .distance(LINK_DISTANCE * 1.0)
              .strength((d: any) => getLinkStrength(d) * 1.0)
          )
          .force('charge', d3.forceManyBody().strength((d: any) => getRepulsion(d) * 1.0))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(COLLISION_RADIUS * 1.0))
          .force('intraCluster', forceIntraCluster());
    }

    // Apply dynamic mode - just nudge one random node occasionally
    if (settings.dynamicMode) {
      const NUDGE_INTERVAL = 180; // ~3s at 60fps
      const NUDGE_MAGNITUDE = 0.002; // tiny velocity tweak
      simulation
        .alphaTarget(0.1) // approach 10% of initial energy for perpetual low chaos
        .alphaDecay(ALPHA_DECAY * 0.5) // slower decay to maintain steady chaos
        .velocityDecay(0.95); // less damping to preserve motion

      let tickCount = 0;
      simulation.on("tick.chaos", () => {
        if (++tickCount % NUDGE_INTERVAL === 0 && nodes.length > 0) {
          const node = nodes[Math.floor(Math.random() * nodes.length)] as any;
          node.vx = (node.vx || 0) + (Math.random() - 0.5) * NUDGE_MAGNITUDE;
          node.vy = (node.vy || 0) + (Math.random() - 0.5) * NUDGE_MAGNITUDE;
        }
      });
    } else {
      simulation.on("tick.chaos", null);
      simulation.alphaTarget(0).alphaDecay(ALPHA_DECAY).velocityDecay(0.5);
    }

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
       .scaleExtent([0.1, 10])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString());
      });
     svg.call(zoom as any);
 
    // Create edges
    const link = g
      .append('g')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', '#8b5cf6')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.max(1, Math.min(8, d.weight * 2)));

    // Center the special artist node only once at initialization
    if (specialArtist && typeof (specialArtist as any).x === 'undefined' && typeof (specialArtist as any).y === 'undefined') {
      (specialArtist as any).x = width / 2;
      (specialArtist as any).y = height / 2;
    }

    const node = g
      .append('g')
      .selectAll('circle')
  .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'graph-node')
      .attr('tabindex', -1)
      .attr('r', (d: any) => d.isSpecial ? 40 : Math.max(5, Math.sqrt(d.degree) * 3))
      .attr('fill', (d: any, i: number) => d.isSpecial ? '#f59e42' : d3.schemeCategory10[i % 10])
      .attr('stroke', (d: any) => d.isSpecial ? '#222' : '#fff')
      .attr('stroke-width', (d: any) => d.isSpecial ? 8 : 2)
      .style('filter', (d: any) => d.isSpecial ? 'drop-shadow(0 0 12px #f59e42)' : '')
      .call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended) as any);

    let labels: any;
    if (settings.showLabels) {
      labels = g
        .append('g')
        .selectAll('text')
  .data(nodes)
        .enter()
        .append('text')
        .text((d: any) => d.name)
        .attr('font-size', (d: any) => d.isSpecial ? '18px' : '11px')
        .attr('font-family', (d: any) => d.isSpecial ? 'Segoe UI, Arial, sans-serif' : 'inherit')
        .attr('font-weight', (d: any) => d.isSpecial ? '600' : '400')
        .attr('fill', (d: any) => d.isSpecial ? '#222' : '#444')
        .attr('text-anchor', (d: any) => d.isSpecial ? 'middle' : 'start')
        .attr('alignment-baseline', (d: any) => d.isSpecial ? 'middle' : 'hanging');
    }

    let edgeLabels: any;
    if (settings.showWeights) {
      edgeLabels = g
        .append('g')
        .selectAll('text')
  .data(edges)
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
  nodes.forEach((d: any) => {
        // Clamp all nodes to visible SVG area
        d.x = Math.max(0, Math.min(width, d.x));
        d.y = Math.max(0, Math.min(height, d.y));
      });

      if (labels) {
        labels
          .attr('x', (d: any) => d.x)
          .attr('y', (d: any) => d.y); // Center label for all nodes
      }

      if (edgeLabels) {
        edgeLabels
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2);
      }
    });

    function dragstarted(event: any) {
      if (!event.active && !settings.dynamicMode) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event: any) {
      if (!event.active && !settings.dynamicMode) simulation.alphaTarget(0);
      // For special artist, return to center when drag ends
      if (event.subject.isSpecial) {
        event.subject.fx = width / 2;
        event.subject.fy = height / 2;
      } else {
        event.subject.fx = null;
        event.subject.fy = null;
      }
    }

    return () => {
      // stop sim and remove tick handlers (including the dynamicMode “chaos” tick)
      simulation.on('tick', null);
      simulation.on('tick.chaos', null as any);
      simulation.stop();

      // detach zoom listeners and purge DOM to drop references
      if (svgRef.current) {
        const svgSel = d3.select(svgRef.current);
        svgSel.on('.zoom', null);
        svgSel.selectAll('*').interrupt();
        svgSel.selectAll('*').remove();
      }
    };
  }, [data, settings.dynamicMode, settings.layout, settings.showLabels, settings.showWeights, viewportKey]);

  return svgRef;
}
