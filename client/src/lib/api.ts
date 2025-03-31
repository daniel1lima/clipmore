const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface DashboardStats {
  totalClips: number;
  totalUsers: number;
  totalCampaigns: number;
  pendingModeration: number;
}

interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  totalViews: number;
  maxPayout: number;
  rate: number;
  status: string;
}

interface Log {
  id: string;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  metadata: string;
}

interface Clip {
  id: string;
  url: string;
  createdAt: string;
  views: number;
  user?: {
    discordId: string;
  };
}
interface ClipBreakdown {
  id: string;
  url: string;
  views: number;
  rate: number;
  earnings: number;
  createdAt: string;
}

export interface PaymentUser {
  discordId: string;
  paypalEmail: string;
  totalOwed: number;
  clipCount: number;
  campaigns: string[];
  status: 'PENDING' | 'PAID' | 'FAILED';
  amountPaid: number;
  paymentDate?: string;
  paymentMethod?: string;
  expedite: boolean;
  createdBy?: string;
  paidBy?: string;
} 

export interface PaymentCampaign {
  discordGuildId: string;
  name: string;
}

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
      credentials: 'include', // This is important for cookies/session
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
  // Add to your API client

  
  getPaymentClips: async (discordId: string, discordGuildId: string): Promise<{
    campaignName: string;
    clips: ClipBreakdown[];
  }> => {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/payment-clips/${discordId}/${discordGuildId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch payment clips');
    }
    return response.json();
  },

  async getCampaigns(): Promise<Campaign[]> {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/campaigns`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch campaigns');
    return response.json();
  },

  async getLogs(): Promise<Log[]> {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/logs`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch logs');
    return response.json();
  },

  async getClips(): Promise<Clip[]> {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/clips`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch clips');
    return response.json();
  },

  async deleteClip(clipId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/clips/${clipId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete clip');
  },

  async getPayments(campaignId?: string): Promise<PaymentUser[]> {
    const url = new URL(`${API_BASE_URL}/admin/dashboard/payments`);
    if (campaignId) {
      url.searchParams.append('campaignId', campaignId);
    }
    
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch payment data');
    return response.json();
  },

  async getPaymentCampaigns(): Promise<PaymentCampaign[]> {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard/payment-campaigns`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch payment campaigns');
    return response.json();
  }
}; 