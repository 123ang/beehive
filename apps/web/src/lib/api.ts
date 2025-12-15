// ============================================
// API CLIENT
// ============================================

import { getApiUrl } from "./apiUrl";

const API_BASE = getApiUrl();

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

  async validateReferralCode(code: string) {
    return this.request<any>(`/api/auth/validate-referral-code?code=${encodeURIComponent(code)}`);
  }

  async register(walletAddress: string, username?: string, email?: string, referralCode?: string) {
    return this.request<any>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ walletAddress, username, email, referralCode }),
    });
  }

  // Member endpoints
  async getDashboard(address?: string) {
    const url = address 
      ? `/api/members/dashboard?address=${encodeURIComponent(address)}`
      : "/api/members/dashboard";
    return this.request<any>(url);
  }

  async getTree(depth: number = 3) {
    return this.request<any>(`/api/members/tree?depth=${depth}`);
  }

  async getMatrix(address?: string) {
    const url = address 
      ? `/api/members/matrix?address=${encodeURIComponent(address)}`
      : "/api/members/matrix";
    return this.request<any>(url);
  }

  async getLayers() {
    return this.request<any>("/api/members/layers");
  }

  async getRewards(address?: string, page: number = 1, limit: number = 20) {
    const url = address 
      ? `/api/members/rewards?address=${encodeURIComponent(address)}&page=${page}&limit=${limit}`
      : `/api/members/rewards?page=${page}&limit=${limit}`;
    return this.request<any>(url);
  }

  async getReferral() {
    return this.request<any>("/api/members/referral");
  }

  async getNFTCollections() {
    return this.request<any>("/api/members/nft");
  }

  async getNFTCollection(id: number) {
    return this.request<any>(`/api/members/nft/${id}`);
  }

  async getClasses() {
    return this.request<any>("/api/members/classes");
  }

  async getClass(id: number) {
    return this.request<any>(`/api/members/classes/${id}`);
  }

  async getMerchants() {
    return this.request<any>("/api/members/merchants");
  }

  async getMerchant(id: number) {
    return this.request<any>(`/api/members/merchants/${id}`);
  }

  async getNews(lang?: string) {
    const url = lang ? `/api/members/news?lang=${lang}` : "/api/members/news";
    return this.request<any>(url);
  }

  async getNewsArticle(id: number, lang?: string) {
    const url = lang ? `/api/members/news/${id}?lang=${lang}` : `/api/members/news/${id}`;
    return this.request<any>(url);
  }

  async registerMember(txHash: string, level: number, referrerAddress: string) {
    return this.request<any>("/api/members/register", {
      method: "POST",
      body: JSON.stringify({ txHash, level, referrerAddress }),
    });
  }

  async upgradeMembership(txHash: string, level: number, walletAddress: string) {
    return this.request<any>("/api/members/upgrade", {
      method: "POST",
      body: JSON.stringify({ txHash, level, walletAddress }),
    });
  }

  async withdraw(walletAddress: string, currency: "USDT" | "BCC", amount: number) {
    return this.request<any>("/api/members/withdraw", {
      method: "POST",
      body: JSON.stringify({ walletAddress, currency, amount }),
    });
  }

  // Newsletter endpoints
  async subscribeNewsletter(email: string) {
    return this.request<{ message: string }>("/api/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async unsubscribeNewsletter(email: string) {
    return this.request<{ message: string }>("/api/newsletter/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }
}

export const api = new ApiClient();

