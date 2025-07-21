import React, { useState, useMemo, useEffect } from 'react';
import { Client, Databases, ID, Query } from 'appwrite';
import { Search, Filter, TrendingDown, Package, Calendar, Clock, XCircle, BarChart3, PieChart, Lightbulb } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';


const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const DB_ID = import.meta.env.VITE_APPWRITE_DB_ID;
// Use the main sales order collection ID now
const SALES_ORDERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_SALES_ORDERS_ID;

function getCurrentWeek() {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay();
    const last = first + 6;
    const firstday = new Date(curr.setDate(first)).toLocaleDateString();
    const lastday = new Date(curr.setDate(last)).toLocaleDateString();
    return `${firstday} - ${lastday}`;
}

const OrdersReturnsPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aiInsight, setAiInsight] = useState('');
    const [isInsightLoading, setIsInsightLoading] = useState(false);

    // --- Fetch Sales Orders from Appwrite ---
    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const res = await databases.listDocuments(DB_ID, SALES_ORDERS_COLLECTION_ID, [
                    Query.orderDesc('$createdAt') // Show newest first
                ]);
                setOrders(res.documents);
            } catch (err) {
                console.error("Failed to fetch sales orders:", err);
                // In a real app, you might set an error state here
            }
            setLoading(false);
        };

        fetchOrders();
    }, []);

    const handleGetAiInsight = async () => {
        if (returnedOrders.length === 0) {
            setAiInsight("There are no returned items to analyze.");
            return;
        }

        setIsInsightLoading(true);
        setAiInsight('');

        try {
            // We only need to send the description and reason
            const payload = returnedOrders.map(o => ({
                description: o.description,
                return_reason: o.return_reason || 'Not specified'
            }));

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/returns/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to fetch AI insight");
            }

            const result = await response.json();
            setAiInsight(result.insight);

        } catch (error) {
            console.error("Error fetching AI insight:", error);
            setAiInsight(`Error: ${error.message}`);
        } finally {
            setIsInsightLoading(false);
        }
    };


    // --- Existing Demo Data and Filters ---
    const [searchTerm, setSearchTerm] = useState('');

    // --- Dynamic Data Calculations ---
    // This correctly gets only the returned orders
    const returnedOrders = useMemo(() => orders.filter(o => o.status?.toLowerCase() === 'returned'), [orders]);
    
    const totalReturns = returnedOrders.length;
    const dynamicReturnRate = orders.length > 0 ? ((totalReturns / orders.length) * 100).toFixed(1) : 0;
    const processingCount = useMemo(() => orders.filter(o => o.status?.toLowerCase() === 'processing').length, [orders]);
    const refundedAmount = useMemo(() => orders.filter(o => o.status?.toLowerCase() === 'refunded').reduce((sum, o) => sum + o.amount, 0), [orders]);

    const returnReasonsData = useMemo(() => {
        if (returnedOrders.length === 0) return [];
        const reasonCounts = returnedOrders.reduce((acc, order) => {
            // Use the new 'return_reason' field.
            const reason = order.return_reason || 'Unknown';
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
        }, {});

        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
        return Object.entries(reasonCounts).map(([name, value], index) => ({
            name,
            value,
            color: colors[index % colors.length],
        }));
    }, [returnedOrders]);

    const returnTrendsData = [
        { month: 'Jan', returns: 45, orders: 320 },
        { month: 'Feb', returns: 52, orders: 280 },
        { month: 'Mar', returns: 38, orders: 340 },
        { month: 'Apr', returns: 61, orders: 390 },
        { month: 'May', returns: 49, orders: 420 },
        { month: 'Jun', returns: 72, orders: 480 },
        { month: 'Jul', returns: 58, orders: 510 },
    ];

    const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Sports'];
    const returnReasons = ['Poor Sound Quality', 'Wrong Size', 'Damaged in Transit', 'Not as Described', 'Defective Product', 'Poor Quality', 'Wrong Color'];
    const statuses = ['returned', 'processing', 'refunded'];

    const filteredOrders = useMemo(() => {
        // The table should only ever show returned items.
        // We filter the `returnedOrders` array, not the `orders` array.
        return returnedOrders.filter(order => {
            const matchesSearch = order.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.return_reason && order.return_reason.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesSearch;
        });
    }, [searchTerm, returnedOrders]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'returned': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'processing': return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'refunded': return <XCircle className="w-4 h-4 text-blue-500" />;
            default: return null;
        }
    };

    const getStatusBadge = (status) => {
        const baseClass = "px-2 py-1 rounded-full text-xs font-medium";
        switch (status) {
            case 'returned': return `${baseClass} bg-green-100 text-green-800`;
            case 'processing': return `${baseClass} bg-yellow-100 text-yellow-800`;
            case 'refunded': return `${baseClass} bg-blue-100 text-blue-800`;
            default: return baseClass;
        }
    };

    const returnRate = ((filteredOrders.length / (filteredOrders.length + 100)) * 100).toFixed(1);


    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Orders & Returns Analyzer</h1>

                </div>

                {/* Stats Overview - moved to top */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Returns</p>
                            <p className="text-2xl font-bold text-gray-900">{totalReturns}</p>
                        </div>
                        <Package className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Return Rate</p>
                            <p className="text-2xl font-bold text-gray-900">{dynamicReturnRate}%</p>
                        </div>
                        <TrendingDown className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Processing</p>
                            <p className="text-2xl font-bold text-gray-900">{processingCount}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Refunded</p>
                            <p className="text-2xl font-bold text-gray-900">₹{refundedAmount.toFixed(2)}</p>
                        </div>
                        <XCircle className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                {/* --- Dynamic Returns Table --- */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-xl font-bold mb-4">Returns History</h2>
                     {/* Search and Filter UI here */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Reason</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr>
                                ) : filteredOrders.map(order => (
                                    <tr key={order.$id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{order.amount.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={getStatusBadge(order.status.toLowerCase())}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.order_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.return_reason || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* AI Suggestion Banner */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg mb-8 shadow-lg">
                    <div className="flex items-start gap-4">
                        <Lightbulb className="w-8 h-8 text-yellow-300 flex-shrink-0" />
                        <div className="flex-grow">
                            <h3 className="text-lg font-semibold mb-2">AI Insight on Returns</h3>
                            {isInsightLoading ? (
                                <p className="text-purple-100 animate-pulse">Analyzing your returns...</p>
                            ) : (
                                <p className="text-purple-100">{aiInsight || "Click the button to get an AI-powered analysis of your recent returns."}</p>
                            )}
                        </div>
                        <button
                            onClick={handleGetAiInsight}
                            disabled={isInsightLoading}
                            className="bg-white text-purple-600 font-semibold px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                            {isInsightLoading ? "Analyzing..." : "Get AI Insight"}
                        </button>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Return Trends */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Return Trends
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={returnTrendsData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="returns" stroke="#ef4444" strokeWidth={2} />
                                <Line type="monotone" dataKey="orders" stroke="#22c55e" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Return Reasons */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <PieChart className="w-5 h-5" />
                            Return Reasons
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <RechartsPieChart>
                                <Pie
                                    data={returnReasonsData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {returnReasonsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </div>






            </div>
        </div>
    );
};

function formatWeek(weekStr) {
    
    if (!weekStr) return '';
    const [start, end] = weekStr.split(' - ');
    try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const options = { month: 'short', day: 'numeric' };
        const year = endDate.getFullYear();
        return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}, ${year}`;
    } catch {
        return weekStr;
    }
}

export default OrdersReturnsPage;
