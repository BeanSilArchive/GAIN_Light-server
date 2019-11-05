import Router from 'koa-router';

import {
    uploadBoard,
    uploadComment,
    GetPost,
    UpdatePost,
    board_res,
    board_com_res,
    DeletePost,
    DeleteComment,
    BoardData,
    GetAllComment,
    GetBoardList,
    GetComment,
    UpdateComment
} from './post.ctrl';

const post = new Router();

post.get('/board/:kind',GetBoardList);
post.post('/board/:kind',uploadBoard);
post.get('/board/:kind/:board_id', GetPost);
post.put('/board/:kind/:board_id', UpdatePost);
post.delete('/board/:kind/:board_id', DeletePost);
post.post('/board/:kind/:board_id/like', board_res);
post.post('/board/:kind/:board_id/link',BoardData);

post.get('/comment/:board_id',GetAllComment);
post.post('/comment/:board_id',uploadComment);
post.get('/comment/:board_id/:comment_id', GetComment);
post.put('/comment/:board_id/:comment_id', UpdateComment); // TODO: 로그인 안되어있을때 오류 잡기
post.post('/comment/:board_id/:comment_id/like', board_com_res);
post.delete('/comment/:board_id/:comment_id', DeleteComment); // TODO: 게시판 id 댓글 id 검증


export default post;
