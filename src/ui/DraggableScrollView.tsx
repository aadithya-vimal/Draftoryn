import React, { useRef, useState, useEffect } from "react";
import {
  Platform,
  ScrollView,
  type ScrollViewProps,
  View,
} from "react-native";

export interface DraggableScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
}

export function DraggableScrollView({
  children,
  contentContainerStyle,
  style,
  ...props
}: DraggableScrollViewProps) {
  const isWeb = Platform.OS === "web";
  const scrollRef = useRef<any>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    if (!isWeb) return;
    const node = scrollRef.current?.getScrollableNode?.() || scrollRef.current;
    if (!node) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only main left mouse button
      if (e.button !== 0) return;
      setIsDown(true);
      hasDraggedRef.current = false;
      setStartX(e.pageX - node.offsetLeft);
      setScrollLeft(node.scrollLeft);
      node.style.cursor = "grabbing";
      node.style.userSelect = "none";
    };

    const handleMouseLeave = () => {
      setIsDown(false);
      node.style.cursor = "grab";
      node.style.removeProperty("user-select");
    };

    const handleMouseUp = () => {
      setIsDown(false);
      node.style.cursor = "grab";
      node.style.removeProperty("user-select");
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - node.offsetLeft;
      const walk = (x - startX) * 1.6;
      if (Math.abs(walk) > 4) {
        hasDraggedRef.current = true;
      }
      node.scrollLeft = scrollLeft - walk;
    };

    // Prevent accidental clicks when dragging
    const handleClickCapture = (e: MouseEvent) => {
      if (hasDraggedRef.current) {
        e.stopPropagation();
        e.preventDefault();
        hasDraggedRef.current = false;
      }
    };

    node.style.cursor = "grab";
    node.addEventListener("mousedown", handleMouseDown);
    node.addEventListener("mouseleave", handleMouseLeave);
    node.addEventListener("mouseup", handleMouseUp);
    node.addEventListener("mousemove", handleMouseMove);
    node.addEventListener("click", handleClickCapture, true);

    return () => {
      node.removeEventListener("mousedown", handleMouseDown);
      node.removeEventListener("mouseleave", handleMouseLeave);
      node.removeEventListener("mouseup", handleMouseUp);
      node.removeEventListener("mousemove", handleMouseMove);
      node.removeEventListener("click", handleClickCapture, true);
    };
  }, [isWeb, isDown, startX, scrollLeft]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={contentContainerStyle}
      style={style}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
