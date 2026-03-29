# Work Notes - v5.7

## DB Map Nodes (31 total)
- 迷霧城 (10): id 1-10, all in Taipei
- 初界 (10): id 11-20, across Taiwan
- 中界 (9): id 21-29, Japan/Korea/China
- 試煉之塔 (1): id 30, Switzerland
- 碎影深淵 (1): id 31, Nepal

## Approach
The game already has 212 static nodes in shared/mapNodes.ts (all Taiwan).
DB nodes are NPC-hosting nodes in overseas locations.

### Plan:
1. Add 31 DB nodes to shared/mapNodes.ts as new MapNode entries
2. Add their coordinates to LeafletMap.tsx NODE_COORDS
3. Modify getMapNodes to merge static + DB nodes
4. Modify getNodeInfo to include NPC data for nodes
5. Add NPC section to NodeInfoPanel
6. Create NPC dialogue/interaction system
7. Create travel system for overseas nodes
