import Joi from 'joi';
import { decodeToken } from '../../../lib/token';
import { points,student } from '../../../models';

export const POINT = async (ctx) => {  //상벌점 등록 + student테이블의 point에 값 누적 , 관리자용!
    const Request = Joi.object().keys({
        giver_id: Joi.number().integer().required(),
        receiver_id: Joi.number().integer().required(),
        kind: Joi.number().integer().required(),
        amount: Joi.number().integer().required(),
        reason_id: Joi.number().integer().required(),
        detail: Joi.string().max(255).required(),
    });

    // 넘어온 body의 형식을 검사한다.
    const Result = Joi.validate(ctx.request.body, Request);

    // 만약 형식이 불일치한다면, 그 이후 문장도 실행하지 않는다.
    if (Result.error) {
        console.log(`/dormitory/point - Joi 형식 에러`);
        ctx.status = 400;
        ctx.body = "형식에러!";
        return;
    }
    const { giver_id, receiver_id, kind, amount, reason_id, detail } = ctx.request.body;

    try {
        await points.create({  //db에 추가
            giver_id: giver_id,
            receiver_id: receiver_id,
            kind: kind,
            amount: amount,
            reason_id: reason_id,
            detail: detail
        });

        let StudentObject = await student.findOne({ 
            where: {
                user_id: receiver_id
            }
        });

        let currentPoint = StudentObject.point;
        
        if (kind === "상점") {
            currentPoint += amount;
        } else if (kind === "벌점") {
            currentPoint -= amount;
        } else {
            ctx.body = "이상한 값이 들어왔다구웃!";
            ctx.status = 400;
            return;
        }
        // 지금까지 받은 상벌점 총 합계와 지금 받은 상벌점을 더한다.

        await student.update({ // TODO: Possible Bug
            "point": currentPoint
        }, {
            where: {
                user_id: receiver_id
            }
        });

        ctx.status = 200;
        ctx.body = {
            "user_id" : giver_id
        };
    } catch (error) {
        console.error(error);
        ctx.status = 500;
    } 
};


export const ALLPOINT = async (ctx) => { // 상벌점 전체 조회-관리자 , 관리자용!
    try{
        const allStudentPoint = await points.findAll();
        ctx.status = 200;
        ctx.body = allStudentPoint;
    } catch(error) {
        console.error(error);
        return ctx.status = 500;
    }
};


export const INDIVIDUALPOINT = async (ctx)=>{  //상벌점 본인 조회-로그인한 본인
    console.log("도착");
    const token = ctx.header.token;
    const decoded = await decodeToken(token);
    const StudentId = decoded.user_id; //토큰에서 로그인한 학생의 user_id 가져오기
    try{
        const Studentallstatus = await points.findAll({  //해당 user_id의 학생이 받은 상벌점 현황 싹다 뽑기
            where: {
                receiver_id: StudentId
            }
        });

        ctx.status = 200;
        ctx.body = Studentallstatus;
    } catch(error) {
        console.error(error);
        return ctx.status = 500;
    }
};


export const PUT_POINT=async(ctx)=>{  // 상벌점 수정 + student테이블의 point에 값 누적, 관리자용!
    const Request = Joi.object().keys({
        giver_id:Joi.number().integer().required(),
        receiver_id:Joi.number().integer().required(),
        kind:Joi.number().integer().required(),
        amount:Joi.number().integer().required(),
        reason_id:Joi.number().integer().required(),
        detail:Joi.string().max(255).required(),
    });

    // 넘어온 body의 형식을 검사한다.
    const Result = Joi.validate(ctx.request.body, Request);

    // 만약 형식이 불일치한다면, 그 이후 문장도 실행하지 않는다.
    if(Result.error) {
        console.log(`/dormitory/point/:id - Joi 형식 에러`);
        ctx.status = 400;
        ctx.body = {
            "error" : "001"
        };
        return;
    }

    const { id } = ctx.params;
    const { giver_id, receiver_id, kind, amount, reason_id, detail } = ctx.request.body;
    try{
        const wrongPoint = await points.findOne({ // 잘못 저장된 상벌점 점수: wrongPoint
            where:{
                point_id:id
            },
            attributes:["amount","kind"]
        });

        await points.update({
            giver_id: giver_id,
            receiver_id: receiver_id,
            kind: kind,
            amount: amount,
            reason_id: reason_id,
            detail: detail
        }, { where: { point_id: id } });

        const StudentpastPoint = await student.findOne({ // student테이블 에서 지금까지 누적된 상벌점 점수: StudentpastPoint
            where: {
                user_id: receiver_id
            },
            attributes: ["point"]
        });
        let pastPoint;
        if (wrongPoint.kind === "벌점") {    // 벌점이면 -1곱하기
            pastPoint = wrongPoint.amount*(-1);
        } else {
            pastPoint = wrongPoint.amount;
        }

        let amountPoint;
        if(kind === "벌점"){  // 벌점이면 -1곱하기
            amountPoint = amount*(-1);
        } else {
            amountPoint = amount;
        }
        
        await student.update({ //수정
            where: {
                user_id: receiver_id
            },
            point: StudentpastPoint-pastPoint+amountPoint //지금까지 누적된 점수 - 잘못 저장됬던 점수 + 바른점수
        });
        ctx.status = 200;
    } catch(error) {
        console.error(error);
        ctx.status = 500;
    }
};


export const DEL_POINT = async (ctx) => { // 상벌점 삭제 + student테이블의 point에 값 누적, 관리자용!
    const { id } = ctx.params;

    try{
        const columeInformation = await points.findOne({ //삭제할 칼럼에서 상벌점 점수랑 유저 id 받아온다.
            where: {
                point_id: id
            },
            attributes: ["kind", "amount", "receiver_id"]
        });

        await points.destroy({  // 삭제한다.
            where: {
                point_id: id
            }
        });

        const StudentpastPoint = await student.findOne({ //student테이블 에서 지금까지 누적된 상벌점 점수
            where: {
                user_id: columeInformation.receiver_id
            },
            attributes: ["point"]
        });
        
        let minusPoint;
        if (columeInformation.kind === "벌점") {  //벌점이면 -1곱하기
            minusPoint = columeInformation.amount * (-1);
        } else {
            minusPoint = columeInformation.amount;
        }

        await student.update({ //삭제된 점수를 빼고 갱신한다.
            where: {
                user_id: columeInformation.receiver_id
            },
            point: StudentpastPoint - minusPoint // 누적 점수-삭제할 점수
        });
        ctx.status = 200;
        
    } catch(error) {
        console.error(error);
        ctx.status = 500;
    }
};