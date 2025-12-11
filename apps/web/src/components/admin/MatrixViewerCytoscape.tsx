"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileImage,
  FileText,
  Info,
  Users,
  TrendingUp,
  Layers,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatNumber, shortenAddress } from "@/lib/utils";
import cytoscape, { Core, NodeSingular } from "cytoscape";
// @ts-ignore
import dagre from "cytoscape-dagre";
// @ts-ignore
import klay from "cytoscape-klay";

// Register layouts
cytoscape.use(dagre);
cytoscape.use(klay);

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

export function MatrixViewerCytoscape({ walletAddress, onSearch }: MatrixViewerProps) {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [member, setMember] = useState<MemberData | null>(null);
  const [statistics, setStatistics] = useState<TreeStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxDepth, setMaxDepth] = useState(5);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
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

  // Build cytoscape elements from tree
  const buildCytoscapeElements = useCallback((node: TreeNode, parentId: string | null = null): any[] => {
    const elements: any[] = [];
    
    // Add current node
    const nodeId = `node-${node.id}`;
    elements.push({
      data: {
        id: nodeId,
        label: node.username || shortenAddress(node.walletAddress, 6),
        fullLabel: node.username || node.walletAddress,
        walletAddress: node.walletAddress,
        level: node.currentLevel || 0,
        position: node.position,
        depth: node.depth,
        memberId: node.id,
        nodeData: node,
      },
    });

    // Add edge from parent
    if (parentId) {
      elements.push({
        data: {
          id: `edge-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          label: `Pos ${node.position}`,
        },
      });
    }

    // Add empty slots (for 3x3 matrix structure)
    const childrenByPosition = [null, null, null];
    node.children?.forEach((child) => {
      if (child.position >= 1 && child.position <= 3) {
        childrenByPosition[child.position - 1] = child;
      }
    });

    // Recursively add children
    childrenByPosition.forEach((child, idx) => {
      if (child) {
        elements.push(...buildCytoscapeElements(child, nodeId));
      } else {
        // Add empty slot node
        const emptyId = `empty-${nodeId}-${idx + 1}`;
        elements.push({
          data: {
            id: emptyId,
            label: `Empty\nPos ${idx + 1}`,
            isEmpty: true,
            position: idx + 1,
          },
          classes: "empty-node",
        });
        elements.push({
          data: {
            id: `edge-${nodeId}-${emptyId}`,
            source: nodeId,
            target: emptyId,
          },
          classes: "empty-edge",
        });
      }
    });

    return elements;
  }, []);

  // Initialize or update Cytoscape
  useEffect(() => {
    if (!tree || !containerRef.current) return;

    const elements = buildCytoscapeElements(tree);

    // Initialize cytoscape
    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: elements,
        style: [
          {
            selector: "node",
            style: {
              "background-color": "#1e293b",
              "border-color": "#475569",
              "border-width": 2,
              label: "data(label)",
              color: "#FBBF24",
              "text-valign": "center",
              "text-halign": "center",
              "font-size": "12px",
              width: 120,
              height: 80,
              shape: "roundrectangle",
              "text-wrap": "wrap",
              "text-max-width": "100px",
            },
          },
          {
            selector: "node.empty-node",
            style: {
              "background-color": "transparent",
              "border-color": "#475569",
              "border-width": 1,
              "border-style": "dashed",
              color: "#64748b",
              opacity: 0.4,
            },
          },
          {
            selector: "node:selected",
            style: {
              "background-color": "#FBBF24",
              "border-color": "#FBBF24",
              "border-width": 3,
              color: "#000000",
            },
          },
          {
            selector: "edge",
            style: {
              width: 2,
              "line-color": "#FBBF24",
              "target-arrow-color": "#FBBF24",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              opacity: 0.6,
              label: "data(label)",
              "font-size": "10px",
              color: "#94a3b8",
              "text-rotation": "autorotate",
            },
          },
          {
            selector: "edge.empty-edge",
            style: {
              "line-style": "dashed",
              opacity: 0.3,
            },
          },
        ],
        layout: {
          name: "dagre",
          rankDir: "TB",
          nodeSep: 80,
          rankSep: 120,
          animate: true,
          animationDuration: 500,
        } as any,
      });

      // Handle node selection
      cyRef.current.on("tap", "node", (event) => {
        const node = event.target;
        const nodeData = node.data("nodeData");
        if (nodeData) {
          setSelectedNode(nodeData);
        }
      });

      // Handle background tap (deselect)
      cyRef.current.on("tap", (event) => {
        if (event.target === cyRef.current) {
          setSelectedNode(null);
        }
      });
    } else {
      // Update existing graph
      cyRef.current.elements().remove();
      cyRef.current.add(elements);
      cyRef.current.layout({
        name: "dagre",
        rankDir: "TB",
        nodeSep: 80,
        rankSep: 120,
        animate: true,
        animationDuration: 500,
      } as any).run();
    }

    // Fit to view
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.fit(undefined, 50);
      }
    }, 100);

    return () => {
      // Cleanup on unmount
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [tree, buildCytoscapeElements]);

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
      cyRef.current.center();
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
      cyRef.current.center();
    }
  };

  const handleFitAll = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  const handleExportPNG = async () => {
    if (!cyRef.current) return;
    
    try {
      const png = cyRef.current.png({ scale: 2, bg: "#0f172a" });
      const link = document.createElement("a");
      link.download = `matrix-${walletAddress}-${Date.now()}.png`;
      link.href = png;
      link.click();
    } catch (err) {
      console.error("Error exporting PNG:", err);
    }
  };

  const handleExportPDF = async () => {
    if (!cyRef.current) return;
    
    try {
      const { default: jsPDF } = await import("jspdf");
      const png = cyRef.current.png({ scale: 2, bg: "#0f172a" });
      
      const pdf = new jsPDF("landscape", "mm", "a4");
      const imgWidth = 297; // A4 width in mm
      const imgHeight = 210; // A4 height in mm
      pdf.addImage(png, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`matrix-${walletAddress}-${Date.now()}.pdf`);
    } catch (err) {
      console.error("Error exporting PDF:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-honey-400 animate-spin mx-auto mb-2" />
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

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm whitespace-nowrap">Layers:</label>
          <select
            value={maxDepth}
            onChange={(e) => setMaxDepth(parseInt(e.target.value))}
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
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" onClick={handleExportPNG} variant="secondary">
            <FileImage className="w-4 h-4 mr-2" />
            PNG
          </Button>
          <Button size="sm" onClick={handleExportPDF} variant="secondary">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Tree Visualization */}
        <div className="lg:col-span-3">
          <Card className="p-4 overflow-hidden">
            <div
              ref={containerRef}
              className="w-full h-[700px] bg-gray-900 rounded-lg"
              style={{ touchAction: "none" }}
            />
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
                <div className="text-white font-mono text-xs break-all mt-1">{member.walletAddress}</div>
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
                  <div className="text-white font-mono text-xs break-all mt-1">{selectedNode.walletAddress}</div>
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

