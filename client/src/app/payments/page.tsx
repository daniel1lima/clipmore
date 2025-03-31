'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api';
import { PaymentUser, PaymentCampaign } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown, DollarSign, ArrowUpDown, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Add payment status type
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

// Extend PaymentUser interface to include new fields matching screenshot
interface ExtendedPaymentUser extends PaymentUser {
  discordGuildId: string;
  status: PaymentStatus;
  amountPaid: number;
  paymentDate?: string;
  paymentMethod?: string;
  expedite: boolean;
  createdBy?: string;
  paidBy?: string;
}

// Add a helper function for safe number formatting
const formatAmount = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return '0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

type SortField = 'status' | 'amountPaid' | 'totalOwed';
type SortDirection = 'asc' | 'desc';

interface PaymentBreakdown {
  id: string;
  url: string;
  campaignName: string;
  views: number;
  rate: number;
  earnings: number;
  createdAt: string;
}

interface ClipBreakdown {
  id: string;
  url: string;
  views: number;
  rate: number;
  earnings: number;
  createdAt: string;
}

interface CampaignBreakdown {
  name: string;
  status: string;
  rate: number;
  clips: ClipBreakdown[];
  totalViews: number;
  totalEarnings: number;
}

const PaymentBreakdownDialog = ({ payment, open, onClose }: {
  payment: PaymentUser | null;
  open: boolean;
  onClose: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [clips, setClips] = useState<ClipBreakdown[]>([]);
  const [campaignName, setCampaignName] = useState<string>('');

  useEffect(() => {
    const fetchClipDetails = async () => {
      if (!payment) return;
      
      try {
        setLoading(true);
        // Use discordGuildId instead of campaign name
        const response = await dashboardApi.getPaymentClips(
          payment.discordId,
          payment.discordGuildId // This should be the discord guild ID
        );
        setClips(response.clips);
        setCampaignName(response.campaignName);
      } catch (error) {
        console.error('Failed to fetch clip details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open && payment) {
      fetchClipDetails();
    }
  }, [open, payment]);

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Breakdown - {campaignName}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {/* Payment Overview */}
          <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-500">Creator</p>
              <p className="text-lg">{payment.discordId}</p>
              <p className="text-sm text-gray-500">{payment.paypalEmail}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Campaign Status</p>
              <span className="inline-flex px-2 py-1 rounded-full text-sm bg-green-100 text-green-800">
                COMPLETED
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Payment Status</p>
              <span className={`inline-flex px-2 py-1 rounded-full text-sm ${
                payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                payment.status === 'PAID' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {payment.status}
              </span>
            </div>
          </div>

          {/* Clips Breakdown */}
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Clip URL</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Views</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Earnings</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {clips.map((clip) => (
                    <tr key={clip.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm">
                        <a 
                          href={clip.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {new URL(clip.url).hostname}
                        </a>
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        {clip.views.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        ${clip.rate}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        ${formatAmount(clip.earnings)}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {new Date(clip.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td className="px-3 py-2 text-sm">Total</td>
                    <td className="px-3 py-2 text-sm text-right">
                      {clips.reduce((sum, clip) => sum + clip.views, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-right"></td>
                    <td className="px-3 py-2 text-sm text-right">
                      ${formatAmount(payment.totalOwed)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 bg-gray-50 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Clips</p>
              <p className="text-lg">{clips.length || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Views</p>
              <p className="text-lg">
                {clips.reduce((sum, clip) => sum + clip.views, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <p className="text-xl font-bold">${formatAmount(payment.totalOwed)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<ExtendedPaymentUser[]>([]);
  const [campaigns, setCampaigns] = useState<PaymentCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ExtendedPaymentUser | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [paymentsData, campaignsData] = await Promise.all([
          dashboardApi.getPayments(selectedCampaign),
          dashboardApi.getPaymentCampaigns()
        ]);
        
        // Transform payment data to include status and other fields
        const extendedPayments = paymentsData.map(payment => ({
          ...payment,
          discordGuildId: payment.campaigns[0],
          status: 'PENDING' as PaymentStatus, // Default status
          amountPaid: 0,
          expedite: false,
        }));
        
        setPayments(extendedPayments);
        setCampaigns(campaignsData);
      } catch (error) {
        console.error('Failed to load payment data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCampaign]);

  const groupedPayments = payments.reduce((acc, payment) => {
    if (!acc[payment.status]) {
      acc[payment.status] = [];
    }
    acc[payment.status].push(payment);
    return acc;
  }, {} as Record<PaymentStatus, ExtendedPaymentUser[]>);

  const handlePayment = async (payment: ExtendedPaymentUser) => {
    try {
      // TODO: Implement payment processing
      console.log('Processing payment for:', payment.discordId);
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortPayments = (payments: ExtendedPaymentUser[]) => {
    return [...payments].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      
      switch (sortField) {
        case 'status':
          return multiplier * a.status.localeCompare(b.status);
        case 'amountPaid':
          return multiplier * (Number(a.amountPaid) - Number(b.amountPaid));
        case 'totalOwed':
          return multiplier * (Number(a.totalOwed) - Number(b.totalOwed));
        default:
          return 0;
      }
    });
  };

  const showPaymentBreakdown = (payment: ExtendedPaymentUser) => {
    setSelectedPayment(payment);
    console.log(payment);
    setShowBreakdown(true);
  };

  const SortButton = ({ field, label }: { field: SortField, label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="group inline-flex items-center space-x-1"
    >
      <span>{label}</span>
      <ArrowUpDown className={cn(
        "h-4 w-4 transition-colors",
        sortField === field ? "text-blue-500" : "text-gray-300 group-hover:text-gray-400"
      )} />
    </button>
  );

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <SidebarTrigger className="text-white mt-2 ml-2 hover:cursor-pointer"/>
      <div className="mb-4 p-5">
        <h1 className="text-2xl font-bold mb-4 text-white">Payment Management</h1>
        
        <div className="mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[280px] justify-between"
              >
                {selectedCampaign
                  ? campaigns.find((campaign) => campaign.discordGuildId === selectedCampaign)?.name
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
                    key={campaign.discordGuildId}
                    className={cn(
                      "flex items-center px-2 py-2 rounded-md cursor-pointer hover:bg-slate-100",
                      selectedCampaign === campaign.discordGuildId && "bg-slate-100"
                    )}
                    onClick={() => setSelectedCampaign(campaign.discordGuildId)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCampaign === campaign.discordGuildId ? "opacity-100" : "opacity-0"
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

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full bg-white border rounded-lg text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="status" label="Status" />
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="amountPaid" label="Amount" />
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="totalOwed" label="Paying" />
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paying
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campaign
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exp
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paid By
              </th>

            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {sortPayments(payments).map((payment) => (
              <tr key={`${payment.discordId}-${payment.campaigns.join('-')}`} 
                  className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    payment.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {payment.status}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-medium">
                  ${formatAmount(payment.amountPaid)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-medium">
                  ${formatAmount(payment.totalOwed)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                  {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-medium">
                  {payment.paypalEmail || '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                  {payment.campaigns.join(', ')}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                  {payment.paymentMethod || '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <input 
                    type="checkbox" 
                    checked={payment.expedite}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    onChange={() => {/* Handle expedite toggle */}}
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                  {payment.createdBy || '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                  {payment.paidBy || '-'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <div className="flex space-x-2">
                    {payment.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded"
                        onClick={() => handlePayment(payment)}
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Pay
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => showPaymentBreakdown(payment)}
                      className="inline-flex items-center px-2 py-1 text-xs"
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaymentBreakdownDialog 
        payment={selectedPayment}
        open={showBreakdown}
        onClose={() => setShowBreakdown(false)}
      />
    </div>
  );
}
