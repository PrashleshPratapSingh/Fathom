// API client for Fathom backend

import type { DagResponse, RewindRequest, RewindResponse, RunResponse } from '../types/api';

const API_BASE = '/api/v1';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }
  return response.json();
}

export async function fetchRuns(): Promise<RunResponse[]> {
  return fetchJSON<RunResponse[]>(`${API_BASE}/runs`);
}

export async function fetchDag(runId: string): Promise<DagResponse> {
  return fetchJSON<DagResponse>(`${API_BASE}/runs/${runId}/dag`);
}

export async function rewindSpan(
  runId: string,
  request: RewindRequest,
): Promise<RewindResponse> {
  return fetchJSON<RewindResponse>(`${API_BASE}/runs/${runId}/rewind`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
