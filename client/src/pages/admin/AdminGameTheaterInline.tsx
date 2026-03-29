/**
 * AdminGameTheaterInline — 將 AdminGameTheater 的各 Tab 組件以 section prop 方式嵌入 GameCMS
 * 
 * 直接從 AdminGameTheater.tsx 導入已有組件，確保 tRPC 路徑正確
 * 
 * section 對應：
 * - "world" → 角色管理 + 全域參數 + Tick 引擎 + 引擎調控 + 世界事件 + 奇遇事件
 * - "shop" → 商店管理
 * - "broadcast" → 全服廣播
 * - "reset" → 世界重置
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AgentManagementTab,
  GameConfigTab,
  TickEngineTab,
  EngineControlTab,
  WorldEventTab,
  RogueEventTab,
  ShopManagementTab,
  BroadcastTab,
  WorldResetTab,
} from "./AdminGameTheater";
import { MapNodesTab } from "@/components/admin/MapNodesTab";

export default function AdminGameTheaterInline({ section }: { section: "world" | "shop" | "broadcast" | "reset" }) {
  if (section === "world") return <WorldSection />;
  if (section === "shop") return <ShopManagementTab />;
  if (section === "broadcast") return <BroadcastTab />;
  if (section === "reset") return <WorldResetTab />;
  return null;
}

function WorldSection() {
  return (
    <Tabs defaultValue="map-nodes">
      <TabsList className="mb-4 flex-wrap h-auto gap-1">
        <TabsTrigger value="map-nodes">🗺️ 地圖節點</TabsTrigger>
        <TabsTrigger value="agents">👤 角色管理</TabsTrigger>
        <TabsTrigger value="configs">⚙️ 全域參數</TabsTrigger>
        <TabsTrigger value="tick">⚡ Tick 引擎</TabsTrigger>
        <TabsTrigger value="engine">🌟 引擎調控</TabsTrigger>
        <TabsTrigger value="world">🌍 世界事件</TabsTrigger>
        <TabsTrigger value="rogue">🎲 奇遇事件</TabsTrigger>
      </TabsList>
      <TabsContent value="map-nodes"><MapNodesTab /></TabsContent>
      <TabsContent value="agents"><AgentManagementTab /></TabsContent>
      <TabsContent value="configs"><GameConfigTab /></TabsContent>
      <TabsContent value="tick"><TickEngineTab /></TabsContent>
      <TabsContent value="engine"><EngineControlTab /></TabsContent>
      <TabsContent value="world"><WorldEventTab /></TabsContent>
      <TabsContent value="rogue"><RogueEventTab /></TabsContent>
    </Tabs>
  );
}
