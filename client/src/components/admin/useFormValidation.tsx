/**
 * useFormValidation.ts
 * 通用表單驗證 hook
 * 提供欄位級即時驗證、錯誤訊息、表單提交前檢查
 */
import { useState, useCallback } from "react";

export interface ValidationRule {
  /** 是否必填 */
  required?: boolean | string;
  /** 最小長度 */
  minLength?: { value: number; message: string };
  /** 最大長度 */
  maxLength?: { value: number; message: string };
  /** 正則驗證 */
  pattern?: { value: RegExp; message: string };
  /** 自訂驗證函式 */
  validate?: (value: any) => string | true;
}

export type ValidationRules<T extends Record<string, any>> = Partial<
  Record<keyof T, ValidationRule>
>;

export function useFormValidation<T extends Record<string, any>>(
  rules: ValidationRules<T>
) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  /** 驗證單一欄位 */
  const validateField = useCallback(
    (name: keyof T, value: any): string | null => {
      const rule = rules[name];
      if (!rule) return null;

      // 必填
      if (rule.required) {
        const isEmpty =
          value === undefined ||
          value === null ||
          (typeof value === "string" && !value.trim());
        if (isEmpty) {
          return typeof rule.required === "string"
            ? rule.required
            : `此欄位為必填`;
        }
      }

      if (typeof value === "string") {
        // 最小長度
        if (rule.minLength && value.length < rule.minLength.value) {
          return rule.minLength.message;
        }
        // 最大長度
        if (rule.maxLength && value.length > rule.maxLength.value) {
          return rule.maxLength.message;
        }
        // 正則
        if (rule.pattern && !rule.pattern.value.test(value)) {
          return rule.pattern.message;
        }
      }

      // 自訂驗證
      if (rule.validate) {
        const result = rule.validate(value);
        if (result !== true) return result;
      }

      return null;
    },
    [rules]
  );

  /** 標記欄位已觸碰並驗證 */
  const onBlur = useCallback(
    (name: keyof T, value: any) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name, value);
      setErrors((prev) => {
        const next = { ...prev };
        if (error) {
          (next as any)[name] = error;
        } else {
          delete next[name];
        }
        return next;
      });
    },
    [validateField]
  );

  /** 驗證所有欄位（提交前呼叫） */
  const validateAll = useCallback(
    (data: Partial<T>): boolean => {
      const newErrors: Partial<Record<keyof T, string>> = {};
      const newTouched: Partial<Record<keyof T, boolean>> = {};
      let valid = true;

      for (const key of Object.keys(rules) as (keyof T)[]) {
        newTouched[key] = true;
        const error = validateField(key, data[key]);
        if (error) {
          newErrors[key] = error;
          valid = false;
        }
      }

      setErrors(newErrors);
      setTouched(newTouched);
      return valid;
    },
    [rules, validateField]
  );

  /** 取得欄位的錯誤訊息（僅在 touched 後顯示） */
  const getError = useCallback(
    (name: keyof T): string | undefined => {
      return touched[name] ? errors[name] : undefined;
    },
    [errors, touched]
  );

  /** 取得欄位的 className（有錯誤時加紅色邊框） */
  const getFieldClass = useCallback(
    (name: keyof T, baseClass = ""): string => {
      const error = getError(name);
      return error
        ? `${baseClass} border-red-500/70 focus:ring-red-500/50`
        : baseClass;
    },
    [getError]
  );

  /** 重置所有驗證狀態 */
  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    onBlur,
    validateAll,
    getError,
    getFieldClass,
    reset,
    hasErrors: Object.keys(errors).length > 0,
  };
}

/**
 * FormFieldError 元件 - 顯示欄位錯誤訊息
 */
export function FormFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-400 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
      {message}
    </p>
  );
}

export default useFormValidation;
