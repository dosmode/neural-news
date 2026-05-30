import * as d3 from 'd3';
import { Article, MappedPoint } from '@/types';

export function calculateClustering(
  articles: Article[],
  activeKeywords: Set<string>,
  filterWeights: Record<string, number>,
  width: number,
  height: number
): MappedPoint[] {
  // 1. Filter articles that have relevance to active keywords
  const visibleArticles = articles.filter(article => 
    Object.keys(article.relevanceMap).some(kw => activeKeywords.has(kw))
  );

  // If no keywords active, show all as neutral or return empty
  const dataToSimulate = visibleArticles.length > 0 ? visibleArticles : articles;

  // 2. Setup simulation
  const simulation = d3.forceSimulation(dataToSimulate as any)
    .force('x', d3.forceX(width / 2).strength(0.05))
    .force('y', d3.forceY(height / 2).strength(0.05))
    .force('collide', d3.forceCollide(20))
    .stop();

  // 3. Custom attraction forces based on weights and relevance
  dataToSimulate.forEach((d: any) => {
    let targetX = width / 2;
    let targetY = height / 2;
    
    // Calculate a "gravity center" based on relevance to active keywords
    let totalRelevance = 0;
    Object.entries(d.relevanceMap).forEach(([kw, relevance]) => {
      if (activeKeywords.has(kw)) {
        // Move points toward different quadrants based on keywords (simplified)
        // In a real app, keyword nodes have actual coordinates to pull towards
        const hash = kw.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const angle = (hash % 360) * (Math.PI / 180);
        targetX += Math.cos(angle) * (relevance as number) * 200;
        targetY += Math.sin(angle) * (relevance as number) * 200;
        totalRelevance += relevance as number;
      }
    });

    if (totalRelevance > 0) {
      d.x = d.x || width / 2;
      d.y = d.y || height / 2;
      d.vx = (targetX - d.x) * 0.1;
      d.vy = (targetY - d.y) * 0.1;
    }
  });

  // 4. Run simulation for a few ticks to stabilize
  for (let i = 0; i < 50; ++i) simulation.tick();

  return dataToSimulate.map((d: any) => ({
    ...d,
    x: d.x,
    y: d.y,
  }));
}

export function calculateGradient(articles: Article[], filterWeights: Record<string, number>): string {
  const sentimentWeight = filterWeights['sentiment'] || 0.5;
  
  let totalSentiment = 0;
  articles.forEach(a => {
    if (a.sentiment === 'positive') totalSentiment += 1;
    if (a.sentiment === 'negative') totalSentiment -= 1;
  });

  const avgSentiment = articles.length > 0 ? totalSentiment / articles.length : 0;
  
  // Map average sentiment to colors
  // More positive + higher sentiment weight -> brighter blue/cyan
  // More negative + higher sentiment weight -> brighter red
  if (avgSentiment > 0.2) return 'from-cyan-900 via-black to-blue-900';
  if (avgSentiment < -0.2) return 'from-red-900 via-black to-orange-900';
  
  return 'from-gray-900 via-black to-slate-900';
}
