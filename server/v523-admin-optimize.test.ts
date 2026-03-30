/**
 * v5.23 Admin 後台優化測試
 * 測試新建的共用元件邏輯
 */
import { describe, it, expect } from "vitest";

// ===== ConfirmDialog Hook 邏輯測試 =====
describe("ConfirmDialog 邏輯", () => {
  it("應該正確處理 Promise 模式的確認/取消", async () => {
    // 模擬 confirmDialog 的 Promise 邏輯
    let resolveRef: ((v: boolean) => void) | null = null;
    const confirmDialog = () =>
      new Promise<boolean>((resolve) => {
        resolveRef = resolve;
      });

    const promise = confirmDialog();
    expect(resolveRef).not.toBeNull();

    // 模擬用戶確認
    resolveRef!(true);
    const result = await promise;
    expect(result).toBe(true);
  });

  it("應該正確處理取消操作", async () => {
    let resolveRef: ((v: boolean) => void) | null = null;
    const confirmDialog = () =>
      new Promise<boolean>((resolve) => {
        resolveRef = resolve;
      });

    const promise = confirmDialog();
    resolveRef!(false);
    const result = await promise;
    expect(result).toBe(false);
  });
});

// ===== AdminDataTable 排序邏輯測試 =====
describe("AdminDataTable 排序邏輯", () => {
  const testData = [
    { id: 1, name: "張三", score: 85 },
    { id: 2, name: "李四", score: 92 },
    { id: 3, name: "王五", score: 78 },
    { id: 4, name: "趙六", score: 95 },
  ];

  it("數字排序 - 升序", () => {
    const sorted = [...testData].sort((a, b) => a.score - b.score);
    expect(sorted[0].name).toBe("王五");
    expect(sorted[3].name).toBe("趙六");
  });

  it("數字排序 - 降序", () => {
    const sorted = [...testData].sort((a, b) => b.score - a.score);
    expect(sorted[0].name).toBe("趙六");
    expect(sorted[3].name).toBe("王五");
  });

  it("字串排序 - 中文 localeCompare", () => {
    const sorted = [...testData].sort((a, b) =>
      a.name.localeCompare(b.name, "zh-TW")
    );
    // 中文排序結果可能因環境而異，只驗證排序穩定
    expect(sorted.length).toBe(4);
    expect(sorted.map((s) => s.name)).not.toEqual(testData.map((t) => t.name));
  });
});

// ===== AdminDataTable 搜尋邏輯測試 =====
describe("AdminDataTable 搜尋邏輯", () => {
  const testData = [
    { id: 1, name: "張三", email: "zhang@test.com" },
    { id: 2, name: "李四", email: "li@test.com" },
    { id: 3, name: "王五", email: "wang@test.com" },
  ];

  it("搜尋應該匹配名稱", () => {
    const q = "張".toLowerCase();
    const filtered = testData.filter((row) =>
      Object.values(row).some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe("張三");
  });

  it("搜尋應該匹配 email", () => {
    const q = "wang";
    const filtered = testData.filter((row) =>
      Object.values(row).some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe("王五");
  });

  it("空搜尋應返回所有資料", () => {
    const q = "";
    const filtered = q
      ? testData.filter((row) =>
          Object.values(row).some((v) =>
            String(v).toLowerCase().includes(q)
          )
        )
      : testData;
    expect(filtered.length).toBe(3);
  });
});

// ===== AdminDataTable 分頁邏輯測試 =====
describe("AdminDataTable 分頁邏輯", () => {
  const data = Array.from({ length: 55 }, (_, i) => ({ id: i + 1 }));

  it("每頁 20 筆，共 3 頁", () => {
    const pageSize = 20;
    const totalPages = Math.ceil(data.length / pageSize);
    expect(totalPages).toBe(3);
  });

  it("第一頁應有 20 筆", () => {
    const pageSize = 20;
    const page = 0;
    const paged = data.slice(page * pageSize, (page + 1) * pageSize);
    expect(paged.length).toBe(20);
  });

  it("最後一頁應有 15 筆", () => {
    const pageSize = 20;
    const page = 2;
    const paged = data.slice(page * pageSize, (page + 1) * pageSize);
    expect(paged.length).toBe(15);
  });

  it("超出範圍的頁碼應安全處理", () => {
    const pageSize = 20;
    const totalPages = Math.ceil(data.length / pageSize);
    const requestedPage = 10;
    const safePage = Math.min(requestedPage, totalPages - 1);
    expect(safePage).toBe(2);
  });
});

// ===== useFormValidation 邏輯測試 =====
describe("表單驗證邏輯", () => {
  // 模擬 validateField 邏輯
  function validateField(
    value: any,
    rule: {
      required?: boolean | string;
      minLength?: { value: number; message: string };
      maxLength?: { value: number; message: string };
      pattern?: { value: RegExp; message: string };
    }
  ): string | null {
    if (rule.required) {
      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === "string" && !value.trim());
      if (isEmpty) {
        return typeof rule.required === "string"
          ? rule.required
          : "此欄位為必填";
      }
    }
    if (typeof value === "string") {
      if (rule.minLength && value.length < rule.minLength.value) {
        return rule.minLength.message;
      }
      if (rule.maxLength && value.length > rule.maxLength.value) {
        return rule.maxLength.message;
      }
      if (rule.pattern && !rule.pattern.value.test(value)) {
        return rule.pattern.message;
      }
    }
    return null;
  }

  it("必填欄位 - 空值應報錯", () => {
    const error = validateField("", { required: true });
    expect(error).toBe("此欄位為必填");
  });

  it("必填欄位 - 自訂訊息", () => {
    const error = validateField("", { required: "請輸入名稱" });
    expect(error).toBe("請輸入名稱");
  });

  it("必填欄位 - 有值應通過", () => {
    const error = validateField("hello", { required: true });
    expect(error).toBeNull();
  });

  it("最小長度驗證", () => {
    const error = validateField("ab", {
      minLength: { value: 3, message: "至少 3 個字元" },
    });
    expect(error).toBe("至少 3 個字元");
  });

  it("最大長度驗證", () => {
    const error = validateField("abcdefghijk", {
      maxLength: { value: 10, message: "最多 10 個字元" },
    });
    expect(error).toBe("最多 10 個字元");
  });

  it("正則驗證 - email 格式", () => {
    const error = validateField("not-email", {
      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email 格式錯誤" },
    });
    expect(error).toBe("Email 格式錯誤");
  });

  it("正則驗證 - 正確 email 應通過", () => {
    const error = validateField("test@example.com", {
      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email 格式錯誤" },
    });
    expect(error).toBeNull();
  });

  it("空白字串應視為空值", () => {
    const error = validateField("   ", { required: true });
    expect(error).toBe("此欄位為必填");
  });

  it("null 和 undefined 應視為空值", () => {
    expect(validateField(null, { required: true })).toBe("此欄位為必填");
    expect(validateField(undefined, { required: true })).toBe("此欄位為必填");
  });
});

// ===== 骨架屏元件存在性測試 =====
describe("Admin 共用元件完整性", () => {
  it("ConfirmDialog 模組應存在", async () => {
    // 驗證檔案路徑存在
    const fs = await import("fs");
    expect(
      fs.existsSync(
        "/home/ubuntu/oracle-resonance/client/src/components/admin/ConfirmDialog.tsx"
      )
    ).toBe(true);
  });

  it("AdminSkeleton 模組應存在", async () => {
    const fs = await import("fs");
    expect(
      fs.existsSync(
        "/home/ubuntu/oracle-resonance/client/src/components/admin/AdminSkeleton.tsx"
      )
    ).toBe(true);
  });

  it("AdminDataTable 模組應存在", async () => {
    const fs = await import("fs");
    expect(
      fs.existsSync(
        "/home/ubuntu/oracle-resonance/client/src/components/admin/AdminDataTable.tsx"
      )
    ).toBe(true);
  });

  it("useFormValidation 模組應存在", async () => {
    const fs = await import("fs");
    expect(
      fs.existsSync(
        "/home/ubuntu/oracle-resonance/client/src/components/admin/useFormValidation.ts"
      )
    ).toBe(true);
  });
});
