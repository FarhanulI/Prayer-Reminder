import { useCallback, useEffect, useState } from 'react';

interface UsePaginationOptions {
    totalItems: number;
    itemsPerPage?: number;
    initialPage?: number;
    onPageChange?: (page: number) => void;
    resetKey?: any;
}

/**
 * A reusable hook to handle pagination logic.
 */
export const usePagination = ({
    totalItems,
    itemsPerPage = 20,
    initialPage = 1,
    onPageChange,
    resetKey
}: UsePaginationOptions) => {
    const [currentPage, setCurrentPage] = useState(initialPage);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Reset to initial page when the resetKey (e.g. surah ID) changes
    useEffect(() => {
        setCurrentPage(initialPage);
    }, [resetKey, initialPage]);

    // Trigger onPageChange callback whenever currentPage changes
    useEffect(() => {
        onPageChange?.(currentPage);
    }, [currentPage]);

    const nextPage = useCallback(() => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    }, [totalPages]);

    const prevPage = useCallback(() => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
    }, []);

    const setPage = useCallback((page: number) => {
        setCurrentPage(Math.min(Math.max(1, page), totalPages));
    }, [totalPages]);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    return {
        currentPage,
        totalPages,
        nextPage,
        prevPage,
        setPage,
        startIndex,
        endIndex,
        isFirstPage: currentPage === 1,
        isLastPage: currentPage === totalPages || totalPages === 0,
    };
};
