// ============================================
// API CLIENT
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("beehive_token", token);
      } else {
        localStorage.removeItem("beehive_token");
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("beehive_token");
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  }

  // Auth endpoints
  async getNonce(address: string) {
    return this.request<{ message: string; nonce: string }>("/api/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  }

  async verify(address: string, message: string, signature: string) {
    return this.request<{ token: string; user: any }>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ address, message, signature }),
    });
  }

  async getMe() {
    return this.request<any>("/api/auth/me");
  }

  // Member endpoints
  async getDashboard() {
    return this.request<any>("/api/members/dashboard");
  }

  async getTree(depth: number = 3) {
    return this.request<any>(`/api/members/tree?depth=${depth}`);
  }

  async getLayers() {
    return this.request<any>("/api/members/layers");
  }

  async getRewards(page: number = 1, limit: number = 20) {
    return this.request<any>(`/api/members/rewards?page=${page}&limit=${limit}`);
  }

  async getReferral() {
    return this.request<any>("/api/members/referral");
  }

  async registerMember(txHash: string, level: number, referrerAddress: string) {
    return this.request<any>("/api/members/register", {
      method: "POST",
      body: JSON.stringify({ txHash, level, referrerAddress }),
    });
  }
}

export const api = new ApiClient();

