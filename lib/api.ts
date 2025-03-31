export const dashboardApi = {
  getPaymentClips: async (discordId: string, discordGuildId: string): Promise<{
    campaignName: string;
    clips: ClipBreakdown[];
  }> => {
    const response = await fetch(`/api/dashboard/payment-clips/${discordId}/${discordGuildId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch payment clips');
    }
    return response.json();
  }
}; 