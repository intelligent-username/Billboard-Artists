import { POST } from '../app/api/graph/route';

describe('API /api/graph/generate', () => {
  it('should return a graph', async () => {
    const request = new Request('http://localhost/api/graph/generate', {
      method: 'POST',
      body: JSON.stringify({ vertexLimit: 50, shrinkMethod: 'degree' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.nodes).toBeDefined();
    expect(data.edges).toBeDefined();
  });
});
