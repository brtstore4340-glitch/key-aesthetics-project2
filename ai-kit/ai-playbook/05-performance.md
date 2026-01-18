# Performance First
React:
- Avoid unnecessary re-renders
- Stable dependencies in useEffect/useMemo/useCallback
- Debounce user input where needed
Firebase:
- Minimize reads/writes
- Use indexes wisely
- Avoid listener storms
- Watch for fan-out writes
Async:
- Guard against double-submit
- Handle retries explicitly
