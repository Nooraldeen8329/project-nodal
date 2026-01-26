/**
 * useCanvasKeyboard - 画布键盘事件处理 Hook
 * 管理快捷键和焦点陷阱
 */
import { useEffect, useRef } from 'react';

/**
 * @param {Object} options
 * @param {string|null} options.expandedNoteId - 当前展开的便签 ID
 * @param {Function} options.setExpandedNoteId - 设置展开的便签
 * @param {boolean} options.modalJustClosed - 模态框刚刚关闭标记
 * @param {Function} options.setModalJustClosed - 设置模态框刚刚关闭
 * @param {string|null} options.selectedZoneId - 当前选中的 Zone ID
 * @param {Function} options.deleteZone - 删除 Zone
 * @param {Function} options.createAndExpandNoteAtWorldPosition - 创建便签
 * @param {Function} options.getWorldCenter - 获取世界中心
 */
export function useCanvasKeyboard({
    expandedNoteId,
    setExpandedNoteId,
    modalJustClosed,
    setModalJustClosed,
    selectedZoneId,
    deleteZone,
    createAndExpandNoteAtWorldPosition,
    getWorldCenter
}) {
    // 模态框焦点管理引用
    const modalPreviouslyFocusedRef = useRef(null);
    const modalContentRef = useRef(null);

    // 全局快捷键
    useEffect(() => {
        const handleKeyDown = (e) => {
            // 忽略输入框内的按键
            if (e.target?.closest?.('input, textarea, [contenteditable="true"]')) return;

            // Escape 关闭展开的便签
            if (e.key === 'Escape' && expandedNoteId) {
                e.preventDefault();
                setExpandedNoteId(null);
                setModalJustClosed(true);
                return;
            }

            // N 键创建新便签
            if (e.key === 'n' || e.key === 'N') {
                if (expandedNoteId || modalJustClosed) return;
                const c = getWorldCenter();
                createAndExpandNoteAtWorldPosition(c);
                return;
            }

            // Delete/Backspace 删除选中的 Zone
            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (selectedZoneId) deleteZone(selectedZoneId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        createAndExpandNoteAtWorldPosition,
        deleteZone,
        expandedNoteId,
        getWorldCenter,
        modalJustClosed,
        selectedZoneId,
        setExpandedNoteId,
        setModalJustClosed
    ]);

    // 模态框焦点陷阱
    useEffect(() => {
        if (!expandedNoteId) return;

        modalPreviouslyFocusedRef.current = document.activeElement;

        const focusFirst = () => {
            const root = modalContentRef.current;
            if (!root) return;
            const focusable = root.querySelector(
                'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
            );
            focusable?.focus?.();
        };

        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return;
            const root = modalContentRef.current;
            if (!root) return;

            const focusable = root.querySelectorAll(
                'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        const timer = window.setTimeout(focusFirst, 0);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            modalPreviouslyFocusedRef.current?.focus?.();
        };
    }, [expandedNoteId]);

    return {
        modalPreviouslyFocusedRef,
        modalContentRef
    };
}

export default useCanvasKeyboard;
