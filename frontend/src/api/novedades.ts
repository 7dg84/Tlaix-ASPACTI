import { apiClient } from './api-client';

export const getNewsItems = () => apiClient.get('/novedades/posts/');
export const getNewsItem = (id: string) => apiClient.get(`/novedades/posts/${id}/`);
export const createNewsItem = (data: any) => apiClient.post('/novedades/posts/', data);
export const updateNewsItem = (id: string, data: any) => apiClient.put(`/novedades/posts/${id}/`, data);
export const deleteNewsItem = (id: string) => apiClient.delete(`/novedades/posts/${id}/`);

export const voteInPoll = (postId: string, optionId: string) => 
    apiClient.post(`/novedades/posts/${postId}/vote/`, { option_id: optionId });

export const getComments = (postId: string) => 
    apiClient.get(`/novedades/comments/?news_item=${postId}`);
export const addComment = (postId: string, content: string) => 
    apiClient.post('/novedades/comments/', { news_item: postId, content });
export const deleteComment = (commentId: string) => 
    apiClient.delete(`/novedades/comments/${commentId}/`);
