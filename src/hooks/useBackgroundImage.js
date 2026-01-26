/**
 * useBackgroundImage - 背景图处理 Hook
 * 管理画布背景图的上传、显示和变换
 */
import { useState, useCallback, useRef } from 'react';

/**
 * @param {string} workspaceId - 当前工作区 ID
 * @returns {Object} 背景图状态和操作函数
 */
// eslint-disable-next-line no-unused-vars
export function useBackgroundImage(workspaceId) {
    // 背景图数据
    const [backgroundImage, setBackgroundImage] = useState(null);
    // 背景图变换（位置和缩放）
    const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1 });
    // 是否处于背景图编辑模式
    const [bgSelected, setBgSelected] = useState(false);
    // 文件输入引用
    const fileInputRef = useRef(null);

    // 保存背景图到 IndexedDB
    const saveBackgroundImage = useCallback((image) => {
        // TODO: 保存到 IndexedDB
        console.log('Saving background image:', image);
    }, []);

    // 保存背景图变换到 IndexedDB
    const saveBackgroundTransform = useCallback((transform) => {
        // TODO: 保存到 IndexedDB
        console.log('Saving background transform:', transform);
    }, []);

    // 处理背景图上传
    const handleBackgroundUpload = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const bgData = {
                    dataUrl: event.target.result,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    displayWidth: img.width,
                    displayHeight: img.height
                };
                setBackgroundImage(bgData);
                saveBackgroundImage(bgData);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }, [saveBackgroundImage]);

    // 移除背景图
    const removeBackgroundImage = useCallback(() => {
        setBackgroundImage(null);
        saveBackgroundImage(null);
        setBgSelected(false);
    }, [saveBackgroundImage]);

    // 更新背景图变换
    const updateBgTransform = useCallback((newTransform) => {
        setBgTransform(newTransform);
        saveBackgroundTransform(newTransform);
    }, [saveBackgroundTransform]);

    // 触发文件选择对话框
    const triggerFileInput = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return {
        // 状态
        backgroundImage,
        bgTransform,
        bgSelected,
        fileInputRef,

        // 状态设置函数
        setBackgroundImage,
        setBgTransform,
        setBgSelected,

        // 操作函数
        handleBackgroundUpload,
        removeBackgroundImage,
        updateBgTransform,
        saveBackgroundImage,
        saveBackgroundTransform,
        triggerFileInput
    };
}

export default useBackgroundImage;
