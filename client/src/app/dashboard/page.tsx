'use client';

import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from "@clerk/nextjs";
import moment from 'moment';
import { dashboardApi } from '@/lib/api';
import { useSidebar, SidebarTrigger } from '@/components/ui/sidebar';

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

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalClips: 0,
    totalUsers: 0,
    totalCampaigns: 0,
    pendingModeration: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);;

  const {
    state,
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar,
  } = useSidebar()

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    } else if (user) {
      fetchDashboardData();
    }
  }, [user, isLoaded, router]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [stats, campaigns, logs, clips] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getCampaigns(),
        dashboardApi.getLogs(),
        dashboardApi.getClips()
      ]);

      setStats(stats);
      setCampaigns(campaigns);
      setLogs(logs);
      setClips(clips);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    if (!confirm('Are you sure you want to delete this clip?')) {
      return;
    }

    try {
      await dashboardApi.deleteClip(clipId);
      setClips(clips.filter(clip => clip.id !== clipId));
    } catch (error) {
      console.error('Error deleting clip:', error);
      alert('Failed to delete clip');
    }
  };

  if (!isLoaded || isLoading) {
    return <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>;
  }

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white">
      <SidebarTrigger className='mt-2 ml-2 hover:cursor-pointer'
      />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Total Clips</h3>
            <p className="text-3xl">{stats.totalClips}</p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Total Users</h3>
            <p className="text-3xl">{stats.totalUsers}</p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Active Campaigns</h3>
            <p className="text-3xl">{stats.totalCampaigns}</p>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Pending Moderation</h3>
            <p className="text-3xl">{stats.pendingModeration}</p>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Active Campaigns</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="p-4 border-b border-gray-700">
                <h3 className="font-bold text-lg">{campaign.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                  <div>Created: {moment(campaign.createdAt).format('YYYY-MM-DD')}</div>
                  <div>Views: {campaign.totalViews}</div>
                  <div>Max Payout: ${campaign.maxPayout.toFixed(2)}</div>
                  <div>Status: {campaign.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recent Logs</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Level</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Message</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <Fragment key={log.id}>
                    <tr className="border-b border-gray-700">
                      <td className="px-4 py-2">{moment(log.timestamp).format('YYYY-MM-DD HH:mm:ss')}</td>
                      <td className="px-4 py-2">{log.level}</td>
                      <td className="px-4 py-2">{log.category}</td>
                      <td className="px-4 py-2">{log.message}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm hover:cursor-pointer"
                        >
                          {expandedLogId === log.id ? 'Collapse' : 'Expand'}
                        </button>
                      </td>
                    </tr>
                    {expandedLogId === log.id && (
                      <tr className="bg-gray-700">
                        <td colSpan={5} className="px-4 py-2">
                          <pre className="whitespace-pre-wrap text-sm">
                            {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clips Table */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Clips</h2>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">URL</th>
                  <th className="px-4 py-2 text-left">Created</th>
                  <th className="px-4 py-2 text-left">Views</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clips.map(clip => (
                  <tr key={clip.id} className="border-b border-gray-700">
                    <td className="px-4 py-2">{clip.user?.discordId || 'Unknown'}</td>
                    <td className="px-4 py-2">
                      <a href={clip.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        View
                      </a>
                    </td>
                    <td className="px-4 py-2">{moment(clip.createdAt).format('YYYY-MM-DD HH:mm:ss')}</td>
                    <td className="px-4 py-2">{clip.views}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDeleteClip(clip.id)}
                        className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 