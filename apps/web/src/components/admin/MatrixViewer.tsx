"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FileImage,
  FileText,
  Info,
  Users,
  TrendingUp,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatNumber, shortenAddress, getLevelColor } from "@/lib/utils";

interface TreeNode {
  id: number;
  walletAddress: string;
  username: string | null;
  currentLevel: number | null;
  position: number;
  depth: number;
  children: TreeNode[];
}

interface MemberData {
  id: number;
  walletAddress: string;
  username: string | null;
  currentLevel: number | null;
  totalInflow: string;
  directSponsorCount: number;
  joinedAt: string;
}

interface TreeStatistics {
  teamSize: number;
  maxDepth: number;
  layerCounts: Record<number, number>;
}

interface MatrixViewerProps {
  walletAddress: string;
  onSearch: (wallet: string) => void;
}

export function MatrixViewer({ walletAddress, onSearch }: MatrixViewerProps) {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [member, setMember] = useState<MemberData | null>(null);
  const [statistics, setStatistics] = useState<TreeStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [maxDepth, setMaxDepth] = useState(5);
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const fetchTree = useCallback(async (wallet: string, depth: number = 5) => {
    if (!wallet) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("adminToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const apiPath = apiUrl 
        ? `${apiUrl}/api/admin/users/tree/${wallet}?depth=${depth}` 
        : `/api/admin/users/tree/${wallet}?depth=${depth}`;
      
      const response = await fetch(apiPath, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch tree data");
      }

      const result = await response.json();
      if (result.success && result.data) {
        setTree(result.data.tree);
        setMember(result.data.member);
        setStatistics(result.data.statistics);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load tree");
      console.error("Error fetching tree:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchTree(walletAddress, maxDepth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, maxDepth]);

  useEffect(() => {
    if (tree && containerRef.current) {
      // Auto-fit when tree loads or changes
      setTimeout(() => {
        handleFitAll();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.3));
  
  const handleFitAll = useCallback(() => {
    if (!tree || !containerRef.current) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (!containerRef.current) return;

      const bounds = calculateTreeBounds(tree);
      const treeWidth = bounds.maxX - bounds.minX;
      const treeHeight = bounds.maxY - bounds.minY;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      if (treeWidth === 0 || treeHeight === 0) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      // Calculate zoom to fit with padding
      const padding = 80;
      const scaleX = (containerWidth - padding * 2) / treeWidth;
      const scaleY = (containerHeight - padding * 2) / treeHeight;
      const newZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x

      // Calculate center position of tree
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      // Calculate pan to center the tree in the container
      const newPanX = containerWidth / 2 - centerX * newZoom;
      const newPanY = containerHeight / 2 - centerY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    });
  }, [tree]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleExportPNG = async () => {
    if (!treeRef.current) return;
    
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(treeRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `matrix-${walletAddress}-${Date.now()}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error("Error exporting PNG:", err);
    }
  };

  const handleExportPDF = async () => {
    if (!treeRef.current) return;
    
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(treeRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "mm", "a4");
      const imgWidth = 297; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`matrix-${walletAddress}-${Date.now()}.pdf`);
    } catch (err) {
      console.error("Error exporting PDF:", err);
    }
  };

  const renderNode = (node: TreeNode, x: number, y: number, level: number = 0): JSX.Element => {
    const nodeWidth = 180;
    const nodeHeight = 120;
    const horizontalSpacing = 220;
    const verticalSpacing = 180;
    
    // Ensure we have exactly 3 positions (fill empty slots)
    const children = node.children || [];
    const childrenByPosition: (TreeNode | null)[] = [null, null, null];
    children.forEach((child) => {
      if (child.position >= 1 && child.position <= 3) {
        childrenByPosition[child.position - 1] = child;
      }
    });
    
    return (
      <g key={node.id}>
        {/* Connection lines to children */}
        {childrenByPosition.map((child, idx) => {
          if (!child) return null;
          const childX = x + (idx - 1) * horizontalSpacing;
          const childY = y + verticalSpacing;
          return (
            <line
              key={`line-${child.id}`}
              x1={x}
              y1={y + nodeHeight / 2}
              x2={childX}
              y2={childY - nodeHeight / 2}
              stroke="#FBBF24"
              strokeWidth="2"
              opacity={0.5}
            />
          );
        })}
        
        {/* Node rectangle */}
        <g
          onClick={() => setSelectedNode(node)}
          style={{ cursor: "pointer" }}
        >
          <rect
            x={x - nodeWidth / 2}
            y={y - nodeHeight / 2}
            width={nodeWidth}
            height={nodeHeight}
            rx="8"
            fill={selectedNode?.id === node.id ? "#FBBF24" : "#1e293b"}
            stroke={selectedNode?.id === node.id ? "#FBBF24" : "#475569"}
            strokeWidth={selectedNode?.id === node.id ? "3" : "2"}
            className="hover:stroke-honey-400 transition-colors"
          />
          <text
            x={x}
            y={y - 40}
            textAnchor="middle"
            fill={selectedNode?.id === node.id ? "#000000" : "#FBBF24"}
            fontSize="14"
            fontWeight="bold"
          >
            {node.username || shortenAddress(node.walletAddress)}
          </text>
          <text
            x={x}
            y={y - 20}
            textAnchor="middle"
            fill={selectedNode?.id === node.id ? "#333333" : "#94a3b8"}
            fontSize="11"
          >
            {shortenAddress(node.walletAddress, 6)}
          </text>
          <text
            x={x}
            y={y}
            textAnchor="middle"
            fill={selectedNode?.id === node.id ? "#000000" : "#FBBF24"}
            fontSize="16"
            fontWeight="bold"
          >
            Level {node.currentLevel || 0}
          </text>
          <text
            x={x}
            y={y + 20}
            textAnchor="middle"
            fill={selectedNode?.id === node.id ? "#333333" : "#64748b"}
            fontSize="10"
          >
            Pos: {node.position} | Depth: {node.depth}
          </text>
          <text
            x={x}
            y={y + 40}
            textAnchor="middle"
            fill={selectedNode?.id === node.id ? "#333333" : "#64748b"}
            fontSize="10"
          >
            ID: {node.id}
          </text>
        </g>
        
        {/* Render children (including empty slots) */}
        {childrenByPosition.map((child, idx) => {
          const childX = x + (idx - 1) * horizontalSpacing;
          const childY = y + verticalSpacing;
          if (child) {
            return (
              <g key={child.id}>
                {renderNode(child, childX, childY, level + 1)}
              </g>
            );
          } else {
            // Render empty slot
            return (
              <g key={`empty-${idx}`}>
                <rect
                  x={childX - nodeWidth / 2}
                  y={childY - nodeHeight / 2}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx="8"
                  fill="transparent"
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                  opacity={0.3}
                />
                <text
                  x={childX}
                  y={childY}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="12"
                  opacity={0.5}
                >
                  Empty
                </text>
              </g>
            );
          }
        })}
      </g>
    );
  };

  const calculateTreeBounds = (node: TreeNode, x: number = 0, y: number = 0, level: number = 0): { minX: number; maxX: number; minY: number; maxY: number } => {
    const nodeWidth = 180;
    const horizontalSpacing = 220;
    const verticalSpacing = 180;
    
    let minX = x - nodeWidth / 2;
    let maxX = x + nodeWidth / 2;
    let minY = y - 60;
    let maxY = y + 60;
    
    // Process all 3 positions (even if empty)
    for (let idx = 0; idx < 3; idx++) {
      const child = node.children?.find(c => c.position === idx + 1);
      const childX = x + (idx - 1) * horizontalSpacing;
      const childY = y + verticalSpacing;
      
      if (child) {
        const childBounds = calculateTreeBounds(child, childX, childY, level + 1);
        minX = Math.min(minX, childBounds.minX);
        maxX = Math.max(maxX, childBounds.maxX);
        minY = Math.min(minY, childBounds.minY);
        maxY = Math.max(maxY, childBounds.maxY);
      } else {
        // Account for empty slot space
        minX = Math.min(minX, childX - nodeWidth / 2);
        maxX = Math.max(maxX, childX + nodeWidth / 2);
        minY = Math.min(minY, childY - 60);
        maxY = Math.max(maxY, childY + 60);
      }
    }
    
    return { minX, maxX, minY, maxY };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-white text-xl mb-2">Loading tree...</div>
          <div className="text-gray-400 text-sm">Please wait</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <Button onClick={() => fetchTree(walletAddress, maxDepth)}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!tree || !member) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-4">No tree data available</div>
          <p className="text-gray-500">Search for a wallet address to view the matrix</p>
        </div>
      </div>
    );
  }

  const bounds = calculateTreeBounds(tree);
  const treeWidth = bounds.maxX - bounds.minX;
  const treeHeight = bounds.maxY - bounds.minY;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm whitespace-nowrap">Layers:</label>
          <select
            value={maxDepth}
            onChange={(e) => {
              const newDepth = parseInt(e.target.value);
              setMaxDepth(newDepth);
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-honey-500/50"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((depth) => (
              <option key={depth} value={depth} className="bg-gray-800">
                {depth} {depth === 1 ? "Layer" : "Layers"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleZoomIn} variant="secondary">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleZoomOut} variant="secondary">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleFitAll} variant="secondary">
            <Maximize2 className="w-4 h-4" />
          </Button>
          <span className="text-gray-400 text-sm ml-2">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" onClick={handleExportPNG} variant="secondary">
            <FileImage className="w-4 h-4 mr-2" />
            Export PNG
          </Button>
          <Button size="sm" onClick={handleExportPDF} variant="secondary">
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Tree Visualization */}
        <div className="lg:col-span-3">
          <Card className="p-4 overflow-hidden">
            <div
              ref={containerRef}
              className="relative w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                ref={treeRef}
                className="absolute inset-0"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                <svg
                  width={Math.max(treeWidth + 400, 2000)}
                  height={Math.max(treeHeight + 400, 2000)}
                  style={{
                    position: "absolute",
                    left: `${-bounds.minX + 200}px`,
                    top: `${-bounds.minY + 200}px`,
                  }}
                >
                  {renderNode(tree, centerX, centerY)}
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Statistics and Details */}
        <div className="space-y-4">
          {/* Member Details */}
          <Card className="p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Member Details
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">ID:</span>
                <span className="text-white ml-2">{member.id}</span>
              </div>
              <div>
                <span className="text-gray-400">Wallet:</span>
                <div className="text-white font-mono text-xs break-all">{member.walletAddress}</div>
              </div>
              {member.username && (
                <div>
                  <span className="text-gray-400">Username:</span>
                  <span className="text-white ml-2">{member.username}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Level:</span>
                <span className="text-white ml-2">{member.currentLevel || 0}</span>
              </div>
              <div>
                <span className="text-gray-400">Total Inflow:</span>
                <span className="text-white ml-2">${formatNumber(parseFloat(member.totalInflow || "0"), 2)}</span>
              </div>
              <div>
                <span className="text-gray-400">Direct Referrals:</span>
                <span className="text-white ml-2">{member.directSponsorCount || 0}</span>
              </div>
            </div>
          </Card>

          {/* Statistics */}
          {statistics && (
            <Card className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Team Size</span>
                  <span className="text-white font-bold">{statistics.teamSize}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Max Depth</span>
                  <span className="text-white font-bold">{statistics.maxDepth}</span>
                </div>
                <div className="pt-2 border-t border-gray-700">
                  <div className="text-gray-400 text-sm mb-2">Layer Distribution</div>
                  {Object.entries(statistics.layerCounts)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .slice(0, 5)
                    .map(([depth, count]) => (
                      <div key={depth} className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Layer {depth}</span>
                        <span className="text-white">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </Card>
          )}

          {/* Selected Node Details */}
          {selectedNode && (
            <Card className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Selected Node
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">ID:</span>
                  <span className="text-white ml-2">{selectedNode.id}</span>
                </div>
                <div>
                  <span className="text-gray-400">Wallet:</span>
                  <div className="text-white font-mono text-xs break-all">{selectedNode.walletAddress}</div>
                </div>
                {selectedNode.username && (
                  <div>
                    <span className="text-gray-400">Username:</span>
                    <span className="text-white ml-2">{selectedNode.username}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Level:</span>
                  <span className="text-white ml-2">{selectedNode.currentLevel || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Position:</span>
                  <span className="text-white ml-2">{selectedNode.position}</span>
                </div>
                <div>
                  <span className="text-gray-400">Depth:</span>
                  <span className="text-white ml-2">{selectedNode.depth}</span>
                </div>
                <div>
                  <span className="text-gray-400">Children:</span>
                  <span className="text-white ml-2">{selectedNode.children?.length || 0}</span>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => onSearch(selectedNode.walletAddress)}
                >
                  View This Tree
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

