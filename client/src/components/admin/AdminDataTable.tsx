/**
 * AdminDataTable.tsx
 * 統一後台資料表格元件
 * 功能：排序、搜尋篩選、分頁、空狀態、自訂操作列
 */
import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

// ===== 型別定義 =====
export interface ColumnDef<T> {
  /** 欄位 key（對應 data 物件的 key） */
  key: string;
  /** 表頭顯示文字 */
  header: string;
  /** 自訂渲染 */
  render?: (row: T, index: number) => React.ReactNode;
  /** 是否可排序（預設 false） */
  sortable?: boolean;
  /** 排序用的值提取函式（預設用 row[key]） */
  sortValue?: (row: T) => string | number;
  /** 搜尋用的值提取函式 */
  searchValue?: (row: T) => string;
  /** 欄位寬度 class（如 "w-20"） */
  width?: string;
  /** 對齊方式 */
  align?: "left" | "center" | "right";
  /** 是否在行動裝置隱藏 */
  hideOnMobile?: boolean;
}

export interface AdminDataTableProps<T> {
  /** 資料陣列 */
  data: T[];
  /** 欄位定義 */
  columns: ColumnDef<T>[];
  /** 每頁筆數（預設 20） */
  pageSize?: number;
  /** 是否顯示搜尋框（預設 true） */
  searchable?: boolean;
  /** 搜尋框 placeholder */
  searchPlaceholder?: string;
  /** 空狀態文字 */
  emptyText?: string;
  /** 表格上方的額外操作區 */
  headerActions?: React.ReactNode;
  /** 行點擊事件 */
  onRowClick?: (row: T, index: number) => void;
  /** 行 key 提取函式 */
  rowKey?: (row: T, index: number) => string | number;
  /** 行樣式 class */
  rowClassName?: (row: T, index: number) => string;
  /** 是否顯示序號欄 */
  showIndex?: boolean;
  /** 是否緊湊模式 */
  compact?: boolean;
}

type SortDir = "asc" | "desc" | null;

export function AdminDataTable<T extends Record<string, any>>({
  data,
  columns,
  pageSize = 20,
  searchable = true,
  searchPlaceholder = "搜尋...",
  emptyText = "暫無資料",
  headerActions,
  onRowClick,
  rowKey,
  rowClassName,
  showIndex = false,
  compact = false,
}: AdminDataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  // 搜尋篩選
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = col.searchValue
          ? col.searchValue(row)
          : String(row[col.key] ?? "");
        return val.toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // 排序
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = col.sortValue ? col.sortValue(a) : (a[sortKey] ?? "");
      const bVal = col.sortValue ? col.sortValue(b) : (b[sortKey] ?? "");
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === "asc"
        ? aStr.localeCompare(bStr, "zh-TW")
        : bStr.localeCompare(aStr, "zh-TW");
    });
  }, [filtered, sortKey, sortDir, columns]);

  // 分頁
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePageIndex = Math.min(page, totalPages - 1);
  const paged = useMemo(
    () => sorted.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize),
    [sorted, safePageIndex, pageSize]
  );

  // 排序切換
  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        if (sortDir === "asc") setSortDir("desc");
        else if (sortDir === "desc") {
          setSortKey(null);
          setSortDir(null);
        }
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      setPage(0);
    },
    [sortKey, sortDir]
  );

  const cellPadding = compact ? "px-2 py-1.5" : "px-3 py-2.5";
  const textSize = compact ? "text-xs" : "text-sm";

  return (
    <div className="space-y-3">
      {/* 頂部工具列 */}
      {(searchable || headerActions) && (
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {searchable && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="pl-8 h-8 text-sm bg-slate-800/40 border-slate-700"
              />
            </div>
          )}
          {headerActions && <div className="flex gap-2 flex-wrap">{headerActions}</div>}
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border border-slate-700/50">
        <table className={`w-full ${textSize} border-collapse`}>
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/60">
              {showIndex && (
                <th className={`${cellPadding} text-left text-muted-foreground font-medium w-12`}>
                  #
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${cellPadding} font-medium text-muted-foreground ${
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                      ? "text-right"
                      : "text-left"
                  } ${col.width ?? ""} ${col.hideOnMobile ? "hidden sm:table-cell" : ""} ${
                    col.sortable ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""
                  }`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex flex-col">
                        {sortKey === col.key && sortDir === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5 text-amber-400" />
                        ) : sortKey === col.key && sortDir === "desc" ? (
                          <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showIndex ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => {
                const globalIndex = safePageIndex * pageSize + i;
                return (
                  <tr
                    key={rowKey ? rowKey(row, globalIndex) : globalIndex}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    } ${rowClassName ? rowClassName(row, globalIndex) : ""}`}
                    onClick={onRowClick ? () => onRowClick(row, globalIndex) : undefined}
                  >
                    {showIndex && (
                      <td className={`${cellPadding} text-muted-foreground`}>
                        {globalIndex + 1}
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`${cellPadding} ${
                          col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                            ? "text-right"
                            : "text-left"
                        } ${col.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                      >
                        {col.render
                          ? col.render(row, globalIndex)
                          : (row[col.key] as React.ReactNode) ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            共 {sorted.length} 筆{search ? `（篩選自 ${data.length} 筆）` : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={safePageIndex === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {safePageIndex + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={safePageIndex >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDataTable;
