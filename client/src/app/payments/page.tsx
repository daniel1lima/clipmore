'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api';
import { PaymentUser, PaymentCampaign } from '@/lib/api';
export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentUser[]>([]);
  const [campaigns, setCampaigns] = useState<PaymentCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [paymentsData, campaignsData] = await Promise.all([
          dashboardApi.getPayments(selectedCampaign),
          dashboardApi.getPaymentCampaigns()
        ]);
        setPayments(paymentsData);
        setCampaigns(campaignsData);
      } catch (error) {
        console.error('Failed to load payment data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCampaign]);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Payment Management</h1>
        
        <div className="mb-4">
          <select
            className="border rounded p-2"
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
          >
            <option value="">All Campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Discord ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clips
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campaigns
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Owed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.userId}>
                <td className="px-6 py-4 whitespace-nowrap">{payment.discordId}</td>
                <td className="px-6 py-4 whitespace-nowrap">{payment.paypalEmail}</td>
                <td className="px-6 py-4 whitespace-nowrap">{payment.clipCount}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {payment.campaigns.join(', ')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  ${payment.totalOwed.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    onClick={() => {
                      // Payment handler to be implemented
                      console.log('Process payment for:', payment.userId);
                    }}
                  >
                    Pay
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
