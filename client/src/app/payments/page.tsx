'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api';
import { PaymentUser, PaymentCampaign } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"

import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { SidebarTrigger } from '@/components/ui/sidebar';

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
    <SidebarTrigger className="text-white mt-2 ml-2 hover:cursor-pointer"/>
      <div className="mb-6 p-5">
        <h1 className="text-2xl font-bold mb-4 text-white">Payment Management</h1>
        
        
        <div className="mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[280px] justify-between"
              >
                {selectedCampaign
                  ? campaigns.find((campaign) => campaign.id === selectedCampaign)?.name
                  : "Select campaign..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-2">
              <div className="space-y-1">
                <div
                  className={cn(
                    "flex items-center px-2 py-2 rounded-md cursor-pointer hover:bg-slate-100",
                    selectedCampaign === "" && "bg-slate-100"
                  )}
                  onClick={() => setSelectedCampaign("")}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCampaign === "" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  All Campaigns
                </div>
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={cn(
                      "flex items-center px-2 py-2 rounded-md cursor-pointer hover:bg-slate-100",
                      selectedCampaign === campaign.id && "bg-slate-100"
                    )}
                    onClick={() => setSelectedCampaign(campaign.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCampaign === campaign.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {campaign.name}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg">
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
