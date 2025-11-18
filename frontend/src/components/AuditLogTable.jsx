import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

const AuditLogTable = ({ 
    logs, 
    isLoading, 
    pagination, 
    onPageChange, 
    onSort,
    sortField,
    sortDirection
}) => {
    const [expandedRows, setExpandedRows] = useState(new Set());

    const toggleRow = (logId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(logId)) {
            newExpanded.delete(logId);
        } else {
            newExpanded.add(logId);
        }
        setExpandedRows(newExpanded);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return 'Invalid Date';
        }
    };

    const getPriorityBadge = (priority) => {
        const colors = {
            Critical: 'bg-red-100 text-red-800 border-red-300',
            High: 'bg-orange-100 text-orange-800 border-orange-300',
            Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            Low: 'bg-blue-100 text-blue-800 border-blue-300'
        };
        return colors[priority] || colors.Medium;
    };

    const getStatusBadge = (success) => {
        return success 
            ? 'bg-green-100 text-green-800 border-green-300'
            : 'bg-red-100 text-red-800 border-red-300';
    };

    const handleSort = (field) => {
        if (onSort) {
            onSort(field);
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) {
            return (
                <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortDirection === 'asc' ? (
            <ChevronUpIcon className="w-4 h-4 ml-1 text-[#800000]" />
        ) : (
            <ChevronDownIcon className="w-4 h-4 ml-1 text-[#800000]" />
        );
    };

    if (isLoading && logs.length === 0) {
        return (
            <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>No audit logs found</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300 bg-white" style={{ minWidth: '1200px' }}>
                        <thead className="bg-gray-50">
                            <tr>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[140px]"
                                    onClick={() => handleSort('timestamp')}
                                >
                                    <div className="flex items-center gap-1">
                                        Timestamp
                                        <SortIcon field="timestamp" />
                                    </div>
                                </th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[120px]"
                                    onClick={() => handleSort('userEmail')}
                                >
                                    <div className="flex items-center gap-1">
                                        User
                                        <SortIcon field="userEmail" />
                                    </div>
                                </th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[150px]"
                                    onClick={() => handleSort('actionType')}
                                >
                                    <div className="flex items-center gap-1">
                                        Action
                                        <SortIcon field="actionType" />
                                    </div>
                                </th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider min-w-[180px]"
                                >
                                    Category
                                </th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider min-w-[120px]"
                                >
                                    Resource
                                </th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider min-w-[120px]"
                                >
                                    IP Address
                                </th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider min-w-[100px]"
                                >
                                    Status
                                </th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors min-w-[100px]"
                                    onClick={() => handleSort('priority')}
                                >
                                    <div className="flex items-center gap-1">
                                        Priority
                                        <SortIcon field="priority" />
                                    </div>
                                </th>
                                <th 
                                    scope="col"
                                    className="px-3 py-3.5 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider min-w-[80px]"
                                >
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map((log) => (
                                <React.Fragment key={log._id}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 py-3.5 whitespace-nowrap text-sm text-gray-900">
                                            <div className="font-medium">{formatDate(log.timestamp)}</div>
                                        </td>
                                        <td className="px-3 py-3.5 text-sm">
                                            <div className="max-w-[120px]">
                                                <div className="font-medium text-gray-900 truncate" title={log.userName || log.userEmail || 'System'}>
                                                    {log.userName || log.userEmail || 'System'}
                                                </div>
                                                {log.userRole && (
                                                    <div className="text-xs text-gray-500 truncate" title={log.userRole}>
                                                        {log.userRole}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5 text-sm text-gray-900">
                                            <div className="max-w-[150px]">
                                                <div className="truncate font-medium" title={log.actionType}>
                                                    {log.actionType || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5 text-sm text-gray-700">
                                            <div className="max-w-[180px]">
                                                <div className="truncate" title={log.category}>
                                                    {log.category || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5 text-sm text-gray-700">
                                            <div className="max-w-[120px]">
                                                {log.resourceType ? (
                                                    <>
                                                        <div className="font-medium truncate" title={log.resourceType}>
                                                            {log.resourceType}
                                                        </div>
                                                        {log.resourceId && (
                                                            <div className="text-xs text-gray-500 truncate" title={log.resourceId}>
                                                                ID: {log.resourceId.toString().substring(0, 8)}...
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5 whitespace-nowrap text-sm text-gray-700">
                                            <div className="font-mono text-xs" title={log.ipAddress || 'N/A'}>
                                                {log.ipAddress || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(log.success)}`}>
                                                {log.success ? 'Success' : 'Failure'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3.5 whitespace-nowrap">
                                            {log.priority ? (
                                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${getPriorityBadge(log.priority)}`}>
                                                    {log.priority}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3.5 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => toggleRow(log._id)}
                                                className="inline-flex items-center justify-center w-8 h-8 text-[#800000] hover:text-[#900000] hover:bg-gray-100 rounded-md transition-colors"
                                                aria-label="Toggle details"
                                                title={expandedRows.has(log._id) ? 'Hide details' : 'Show details'}
                                            >
                                                {expandedRows.has(log._id) ? (
                                                    <ChevronUpIcon className="w-5 h-5" />
                                                ) : (
                                                    <ChevronDownIcon className="w-5 h-5" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedRows.has(log._id) && (
                                        <tr>
                                            <td colSpan="9" className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-2">Request Details</h4>
                                                <div className="space-y-1 text-gray-600">
                                                    {log.requestMethod && (
                                                        <div><span className="font-medium">Method:</span> {log.requestMethod}</div>
                                                    )}
                                                    {log.requestEndpoint && (
                                                        <div><span className="font-medium">Endpoint:</span> <code className="text-xs bg-gray-200 px-1 rounded">{log.requestEndpoint}</code></div>
                                                    )}
                                                    {log.responseStatus && (
                                                        <div><span className="font-medium">Status Code:</span> {log.responseStatus}</div>
                                                    )}
                                                    {log.sessionId && (
                                                        <div><span className="font-medium">Session ID:</span> <code className="text-xs bg-gray-200 px-1 rounded">{log.sessionId.substring(0, 20)}...</code></div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 mb-2">Additional Information</h4>
                                                <div className="space-y-1 text-gray-600">
                                                    {log.userAgent && (
                                                        <div className="text-xs break-all"><span className="font-medium">User Agent:</span> {log.userAgent}</div>
                                                    )}
                                                    {log.location && (
                                                        <div><span className="font-medium">Location:</span> {[log.location.city, log.location.region, log.location.country].filter(Boolean).join(', ') || 'N/A'}</div>
                                                    )}
                                                    {log.errorMessage && (
                                                        <div className="text-red-600"><span className="font-medium">Error:</span> {log.errorMessage}</div>
                                                    )}
                                                </div>
                                            </div>
                                            {(log.previousValues || log.newValues) && (
                                                <div className="md:col-span-2">
                                                    <h4 className="font-semibold text-gray-900 mb-2">Changes</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {log.previousValues && (
                                                            <div>
                                                                <div className="text-xs font-medium text-gray-500 mb-1">Previous Values:</div>
                                                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                                                                    {JSON.stringify(log.previousValues, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {log.newValues && (
                                                            <div>
                                                                <div className="text-xs font-medium text-gray-500 mb-1">New Values:</div>
                                                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                                                                    {JSON.stringify(log.newValues, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {log.requestPayload && Object.keys(log.requestPayload).length > 0 && (
                                                <div className="md:col-span-2">
                                                    <h4 className="font-semibold text-gray-900 mb-2">Request Payload</h4>
                                                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                                                        {JSON.stringify(log.requestPayload, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <div className="md:col-span-2">
                                                    <h4 className="font-semibold text-gray-900 mb-2">Metadata</h4>
                                                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                                                        {JSON.stringify(log.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 sm:px-6">
                    {/* Mobile Pagination */}
                    <div className="flex-1 flex justify-between items-center w-full sm:hidden">
                        <button
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg transition-colors ${
                                pagination.page === 1
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                            }`}
                        >
                            <ChevronLeftIcon className="w-4 h-4 mr-1" />
                            Previous
                        </button>
                        <div className="text-sm text-gray-700">
                            Page <span className="font-semibold">{pagination.page}</span> of <span className="font-semibold">{pagination.totalPages}</span>
                        </div>
                        <button
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg transition-colors ${
                                pagination.page === pagination.totalPages
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                            }`}
                        >
                            Next
                            <ChevronRightIcon className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                    
                    {/* Desktop Pagination */}
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between w-full">
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-semibold text-gray-900">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                <span className="font-semibold text-gray-900">
                                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                                </span>{' '}
                                of <span className="font-semibold text-gray-900">{pagination.total}</span> results
                            </p>
                        </div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                                onClick={() => onPageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className={`relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium transition-colors ${
                                    pagination.page === 1
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-[#800000]'
                                }`}
                                aria-label="Previous page"
                            >
                                <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                            {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                                let pageNum;
                                if (pagination.totalPages <= 7) {
                                    pageNum = i + 1;
                                } else if (pagination.page <= 4) {
                                    pageNum = i + 1;
                                } else if (pagination.page >= pagination.totalPages - 3) {
                                    pageNum = pagination.totalPages - 6 + i;
                                } else {
                                    pageNum = pagination.page - 3 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => onPageChange(pageNum)}
                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                                            pagination.page === pageNum
                                                ? 'z-10 bg-[#800000] border-[#800000] text-white'
                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-[#800000]'
                                        }`}
                                        aria-label={`Page ${pageNum}`}
                                        aria-current={pagination.page === pageNum ? 'page' : undefined}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => onPageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                                className={`relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium transition-colors ${
                                    pagination.page === pagination.totalPages
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-[#800000]'
                                }`}
                                aria-label="Next page"
                            >
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </nav>
                    </div>
                </div>
            )}
            
            {/* Pagination Info for Mobile */}
            {pagination && pagination.totalPages > 1 && (
                <div className="bg-gray-50 px-4 py-2 text-center text-xs text-gray-600 sm:hidden border-t border-gray-200">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
            )}
        </div>
    );
};

export default AuditLogTable;

