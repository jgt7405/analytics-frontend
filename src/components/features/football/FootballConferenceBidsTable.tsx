import { useFootballConfData } from "@/hooks/useFootballConfData";
import { FootballConferenceData } from "@/types/football";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function FootballConferenceBidsTable() {
  const { data, isLoading, error, refetch } = useFootballConfData();

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load conference CFP data"
        onRetry={() => refetch()}
        retryLabel="Reload"
      />
    );
  }

  if (isLoading || !data?.data) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const sorted = [...data.data].sort(
    (a, b) => (b.average_bids ?? 0) - (a.average_bids ?? 0)
  );

  const formatBidDistribution = (dist?: Record<string, number>): string => {
    if (!dist) return "N/A";
    const pct0 = ((dist["0"] ?? 0) * 100).toFixed(0);
    const pct1 = ((dist["1"] ?? 0) * 100).toFixed(0);
    const pct2 = ((dist["2"] ?? 0) * 100).toFixed(0);
    const pct3plus = ((dist["3+"] ?? 0) * 100).toFixed(0);
    return `0: ${pct0}% | 1: ${pct1}% | 2: ${pct2}% | 3+: ${pct3plus}%`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Conference
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Avg CFP Bids
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Bid Distribution
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200">
            {sorted.map((conference: FootballConferenceData) => (
              <tr
                key={conference.conference_name}
                className="hover:bg-gray-50 dark:bg-slate-800"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {conference.conference_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {(conference.average_bids ?? 0).toFixed(1)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {formatBidDistribution(
                    conference.bid_distribution as Record<string, number>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
