const mammoth = require('mammoth');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const path = require('path');
const fs = require('fs');
const subjectAboutInfo = require('../json/subjectAboutInfo.json').subjectAboutInfo
const unitAndSubUnit = require('../json/unitAndSubUnit.json').unitAndSubUnit


let choiceList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

//处理空格
function dealSpace(str) {
  let temp_arr = String(str).replace(/\s*/g, '').split('');
  let reg_str = "^\\s*#\\s*#\\s*";
  for (let i = 0, len = temp_arr.length; i < len; i++) {
    reg_str = reg_str + temp_arr[i] + "\\s*"
  }
  if (str !== '适用学期') {
    reg_str += "(:|：)?"
  } else {
    reg_str += "(\\(|（)\\s*册\\s*(\\)|）)\\s*(:|：)?"
  }

  return new RegExp(reg_str)
}

//获取标题的一些信息
function getTitleInfo(str, primaryStr) {
  return primaryStr.replace(dealSpace(str), '').trim()
}

//处理中括号
function dealBracket(str) {
  let temp_arr = String(str).replace(/\s*/g, '').split('');
  let reg_str = "^\\s*(\\[|【)\\s*";
  for (let i = 0, len = temp_arr.length; i < len; i++) {
    reg_str = reg_str + temp_arr[i] + "\\s*"
  }
  reg_str += "(\\]|】)\\s*(:|：)?"
  return new RegExp(reg_str)
}

//获取试题的一些相关的属性
function getItemProperty(str, primaryStr) {
  return primaryStr.replace(dealBracket(str), '').trim()
}

//进一步处理获取试题的一些相关的属性
function dealProperty(jsonObj, key, value, add) {
  if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '0') {
    let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question.length
    if (add) {
      jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1][key] += value
    } else {
      jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1][key] = value
    }
  } else if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '1') {
    let briefLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length
    let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question.length
    if (add) {
      jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1][key] += value
    } else {
      jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1][key] = value
    }
  }
}

//获取题号 (大题)
function getItemNum(primaryStr) {
  primaryStr = primaryStr.replace(/\s*/g, '');
  let reg = /^\d+(\.|。|．)/;
  if (primaryStr.match(reg) == null) {
    return ''
  } else {
    let matchStr = primaryStr.match(reg)[0];
    return matchStr.substring(0, matchStr.length - 1)
  }
}

//获取小题的题号
function getSubItemNum(primaryStr) {
  let reg = /^\s*(\(|（)\d+((\.|。|．|-|_)\d+)?\s*(\)|）)\s*/
  if (primaryStr.match(reg) == null) {
    return ''
  } else {
    let matchStr = primaryStr.match(reg)[0]
    return matchStr
  }
}

//获取小题的分数
function getSubScore(primaryStr) {
  let reg = /^(\s*(\(|（)\d+((\.|。|．|-|_)\d+)?\s*(\)|）)\s*)(\s*(\(|（)\s*(\d|\d+(\.|。|．)\d+)\s*分\s*(\)|）))/
  let score = ''
  if (reg.test(primaryStr)) {
    //获取小题的题号 如 (1)
    let num = getSubItemNum(primaryStr)
    //获取小题的题号和分值  如 (1)(5分)
    let matchStr = primaryStr.match(reg)[0];
    matchStr = matchStr.split(num)[1]
    matchStr = matchStr.replace(/\s*/g, '').replace(/(。|．)/g, '.');
    score = matchStr.slice(1, matchStr.length - 2)
  }
  return score
}

//获取小题的题干信息
function getSubItemDes(primaryStr) {
  let reg = /^(\s*(\(|（)\d+((\.|。|．|-|_)\d+)?\s*(\)|）)\s*)(\s*(\(|（)\s*(\d|\d+(\.|。|．)\d+)\s*分\s*(\)|）))?/
  if (primaryStr.match(reg)) {
    return primaryStr.replace(reg, '').trim()
  } else {
    return ''
  }
}

//获取题干信息
function getItemDes(primaryStr) {
  let reg = /^\s*\d+\s*(\.|。|．)\s*((\(|（)\s*(\d+|\d+(\.|。|．)\d+)\s*分\s*(\)|）))?/;
  if (primaryStr.match(reg)) {
    return primaryStr.replace(reg, '').trim()
  } else {
    return ''
  }
}

//获取分数 (大题)
function getScore(primaryStr) {
  let reg = /(\.|。|．)\s*(\(|（)\s*(\d|\d+(\.|。|．)\d+)\s*分\s*(\)|）)/gi
  let score = ''
  if (reg.test(primaryStr)) {
    let matchStr = primaryStr.match(reg)[0];
    matchStr = matchStr.replace(/\s*/g, '').replace(/。/g, '.');
    score = matchStr.slice(2, matchStr.length - 2)
  }
  return score
}

//判断是否是选择题选项
function judgeIsOption(primaryStr) {
  primaryStr = primaryStr.replace(/\s*/g, '')
  let reg = /^\s*#?\s*[A-Z]\s*(\.|。|．)/
  return reg.test(primaryStr)
}

//选择题的进一步处理
function dealOptions(jsonObj, primaryStr, hasSubItem, add) {
  if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '0') {
    let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question.length
    if (hasSubItem) {
      let subItemLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].SubQuestionList.length
      if (add) {
        let optionsLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].SubQuestionList[subItemLength - 1].Options.length
        jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].SubQuestionList[subItemLength - 1].Options[optionsLength - 1].Text += '<p>' + primaryStr + '</p>'
      } else {
        jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].SubQuestionList[subItemLength - 1].Options.push(dealChoice(primaryStr))
      }
    } else {
      if (add) {
        let optionsLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].Options.length
        jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].Options[optionsLength - 1].Text += '<p>' + primaryStr + '</p>'
      } else {
        jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].Options.push(dealChoice(primaryStr))
      }
    }
  } else if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '1') {
    if (hasSubItem) {
      let briefLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length
      let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question.length
      let subItemLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].SubQuestionList.length
      if (add) {
        let optionsLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].SubQuestionList[subItemLength - 1].Options.length
        jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].SubQuestionList[subItemLength - 1].Options[optionsLength - 1].Text += '<p>' + primaryStr + '</p>'
      } else {
        jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].SubQuestionList[subItemLength - 1].Options.push(dealChoice(primaryStr))
      }
    } else {
      let briefLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length
      let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question.length
      if (add) {
        let optionsLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].Options
        jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].Options[optionsLength - 1].Text += '<p>' + primaryStr + '</p>'
      } else {
        jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].Options.push(dealChoice(primaryStr))
      }
    }
  }
}

//处理选择题
function dealChoice(primaryStr) {
  primaryStr = primaryStr.replace(/\s*/g, '')
  let reg = /^\s*#?\s*[A-Z]\s*(\.|。|．)/
  let obj = {}
  if (primaryStr.match(reg)) {
    if (primaryStr.match(reg)[0].replace(/\s*/g, '').indexOf('#') == 0) {
      obj.IsRight = true;
      for (let i = 0, len = choiceList.length; i < len; i++) {
        if (primaryStr.match(reg)[0].replace(/\s*/g, '').slice(1, 2) == choiceList[i]) {
          obj.Index = i + 1;
          break;
        }
      }
    } else {
      obj.IsRight = false;
      for (let i = 0, len = choiceList.length; i < len; i++) {
        if (primaryStr.match(reg)[0].replace(/\s*/g, '').slice(0, 1) == choiceList[i]) {
          obj.Index = i + 1;
          break;
        }
      }
    }
    obj.Text = '<p>' + primaryStr.replace(reg, '').trim() + '</p>'
    obj.Id = ''
    return obj;
  }
}

//获取题的类型   返回的是 Number
function getItemType(primaryStr, itemTypeNum) {
  if (primaryStr.trim().match(/^#\d+#$/) == null) {
    return itemTypeNum
  } else {
    let match = primaryStr.match(/^#\d+#$/)[0]
    return match.slice(1, match.length - 1)
  }
}

//去掉题干或者选项中的正确答案 (英语专用)
function filterAnswer(primaryStr) {
  return primaryStr.replace(/<u>\s*[A-Za-z]\s*<\/u>/g, '<u>&nbsp;&nbsp;&nbsp;&nbsp;</u>')
}

//对题干断行的处理
function dealItem(item, jsonObj, primaryStr, removeAnswer) {
  if(removeAnswer){
    primaryStr = primaryStr.replace(/<u>[^<]*<\/u>/g, '<u>&nbsp;&nbsp;&nbsp;&nbsp;</u>')
  }
  if (item == 'Item') {
    if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '0') {
      let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question.length
      jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].Text += '<p>' + primaryStr + '</p>'
    } else if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '1') {
      let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length - 1].question.length
      jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length - 1].question[qLength - 1].Text += '<p>' + primaryStr + '</p>'
    }
  } else if (item == 'SubItem') {
    if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '0') {
      let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question.length
      let subQuestionLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].SubQuestionList.length
      jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].SubQuestionList[subQuestionLength - 1].Text += '<p>' + primaryStr + '</p>'
    } else if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '1') {
      let briefLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length
      let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question.length
      let subQuestionLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].SubQuestionList.length
      jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].SubQuestionList[subQuestionLength - 1].Text += '<p>' + primaryStr + '</p>'
    }
  }
}

//处理考点
function dealExaminationPoints(primaryStr, jsonObj) {
  let tempArr = primaryStr.replace(dealBracket('考点'), '').replace(/\s*/g, '').replace(/(．\S*|\.\S*|。\S*)/, '').replace(/:/g, '：').replace(/;/g, '；').split('；'), ExaminationPoints = []
  for (let i = 0, len = tempArr.length; i < len; i++) {
    ExaminationPoints.push(tempArr[i].split('：')[1])
  }
  let knowledgePointList = []
  //考点对应的中文名称数组
  let ExaminationPointsName = []
  //高中数学（文/理）特殊处理
  if (jsonObj.Subject.includes('高中数学')) {
    for (let i = 0, len = subjectAboutInfo.length; i < len; i++) {
      if (subjectAboutInfo[i].subjectName.includes('高中数学')) {
        knowledgePointList = knowledgePointList.concat(subjectAboutInfo[i].knowledgePointList)
      }
    }
  } else {
    for (let i = 0, len = subjectAboutInfo.length; i < len; i++) {
      if (jsonObj.Subject == subjectAboutInfo[i].subjectName) {
        knowledgePointList = subjectAboutInfo[i].knowledgePointList
        break
      }
    }
  }
  //考点对应的fid数组
  let arr = []
  if (ExaminationPoints.length > 0) {
    for (let i = 0, len = ExaminationPoints.length; i < len; i++) {
      for (let j = 0, len2 = knowledgePointList.length; j < len2; j++) {
        if (ExaminationPoints[i] == knowledgePointList[j].pointName) {
          arr.push(knowledgePointList[j].pointId)
          ExaminationPointsName.push(knowledgePointList[j].pointName)
          break
        }
      }
    }
  }
  return {
    arr,
    ExaminationPointsName
  }
}


//对解析无误的jsonObj处理  (1，给小题添加Explain，Analysis，Comments，Special_topics，Examination_points   2，添加相应的rangeMin，rangeMax  3，对考点的处理  4，对必选字段的验证)
function dealJsonObj(jsonObj, jsonArr, lackArr) {
  let materialList = [], lackJsonObj = {titleArr: [], examPointsArr: []}, hasMaterial = false
  for(let i = 0, len = unitAndSubUnit.length; i < len; i ++){
    if(unitAndSubUnit[i].subjectName === jsonObj.Subject){
      jsonObj.SubjectId = unitAndSubUnit[i].subjectId
      jsonObj.Phase = unitAndSubUnit[i].phase
      materialList = unitAndSubUnit[i].materialList
    }
  }
  if(materialList.length === 0){
    lackJsonObj.titleArr.push(`学段学科：${jsonObj.Subject}不和要求，匹配不到该学科`)
  }else{
    for(let i = 0, len = materialList.length; i < len; i ++){
      if(materialList[i].materialName === jsonObj.Material){
        jsonObj.MaterialId = materialList[i].materialId
        hasMaterial = true
      }
    }
  }
  if(!hasMaterial){
    lackJsonObj.titleArr.push(`教材版本：${jsonObj.Material}不和要求，匹配不到当前试卷学科所对应的教材版本`)
  }else{
    let qIndex = 1
    for (let i = 0, len = jsonObj.AllQuestionArr.length; i < len; i++) {
      if(jsonObj.AllQuestionArr[i].hasChild == '0'){
        let qLength = jsonObj.AllQuestionArr[i].question.length
        jsonObj.AllQuestionArr[i].rangeMin = qIndex
        jsonObj.AllQuestionArr[i].rangeMax = qIndex + qLength - 1
        qIndex += qLength
        for(let j = 0; j < qLength; j ++){
          let pointsObj = dealExaminationPoints(jsonObj.AllQuestionArr[i].question[j].Examination_points, jsonObj)
          jsonObj.AllQuestionArr[i].question[j].Examination_points = pointsObj.arr
          jsonObj.AllQuestionArr[i].question[j].Knowledge_points = pointsObj.arr
          if(jsonObj.AllQuestionArr[i].question[j].Examination_points.length === 0){
            lackJsonObj.examPointsArr.push(`第${jsonObj.AllQuestionArr[i].question[j].Serial_num}题的考点匹配不到，请在认真检查`)
          }
          jsonObj.AllQuestionArr[i].question[j].ExaminationPointsName = pointsObj.ExaminationPointsName
          if(jsonObj.AllQuestionArr[i].question[j].SubQuestionList.length > 0){
            let subQLength = jsonObj.AllQuestionArr[i].question[j].SubQuestionList.length
            for(let k = 0; k < subQLength; k ++){
              jsonObj.AllQuestionArr[i].question[j].SubQuestionList[k].Combination_index = k + 1
              jsonObj.AllQuestionArr[i].question[j].SubQuestionList[k].Explain = jsonObj.AllQuestionArr[i].question[j].Explain
              jsonObj.AllQuestionArr[i].question[j].SubQuestionList[k].Analysis = jsonObj.AllQuestionArr[i].question[j].Analysis
              jsonObj.AllQuestionArr[i].question[j].SubQuestionList[k].Comments = jsonObj.AllQuestionArr[i].question[j].Comments
              jsonObj.AllQuestionArr[i].question[j].SubQuestionList[k].Special_topics = jsonObj.AllQuestionArr[i].question[j].Special_topics
              jsonObj.AllQuestionArr[i].question[j].SubQuestionList[k].Examination_points = jsonObj.AllQuestionArr[i].question[j].Examination_points
              jsonObj.AllQuestionArr[i].question[j].SubQuestionList[k].Knowledge_points = jsonObj.AllQuestionArr[i].question[j].Knowledge_points
              jsonObj.AllQuestionArr[i].question[j].SubQuestionList[k].ExaminationPointsName = jsonObj.AllQuestionArr[i].question[j].ExaminationPointsName
            }
          }
        }
      }else if(jsonObj.AllQuestionArr[i].hasChild == '1'){
        let briefLength = jsonObj.AllQuestionArr[i].children.length
        jsonObj.AllQuestionArr[i].rangeMin = qIndex
        let rangeMax = 0
        for(let j = 0; j < briefLength; j ++){
          rangeMax += jsonObj.AllQuestionArr[i].children[j].question.length
        }
        jsonObj.AllQuestionArr[i].rangeMax = qIndex + rangeMax - 1
        for(let j = 0; j < briefLength; j ++){
          let qLength = jsonObj.AllQuestionArr[i].children[j].question.length
          jsonObj.AllQuestionArr[i].children[j].rangeMin = qIndex
          jsonObj.AllQuestionArr[i].children[j].rangeMax = qIndex + qLength - 1
          qIndex += qLength
          for(let k = 0; k < qLength; k ++){
            let pointsObj = dealExaminationPoints(jsonObj.AllQuestionArr[i].children[j].question[k].Examination_points, jsonObj)
            jsonObj.AllQuestionArr[i].children[j].question[k].Examination_points = pointsObj.arr
            jsonObj.AllQuestionArr[i].children[j].question[k].Knowledge_points = pointsObj.arr
            if(jsonObj.AllQuestionArr[i].children[j].question[k].Examination_points.length === 0){
              lackJsonObj.examPointsArr.push(`第${jsonObj.AllQuestionArr[i].children[j].question[k].Serial_num}题的考点匹配不到，请在认真检查`)
            }
            jsonObj.AllQuestionArr[i].children[j].question[k].ExaminationPointsName = pointsObj.ExaminationPointsName
            if(jsonObj.AllQuestionArr[i].children[j].question[k].SubQuestionList.length > 0){
              let subQLength = jsonObj.AllQuestionArr[i].children[j].question[k].SubQuestionList.length
              for(let m = 0; m < subQLength; m ++){
                jsonObj.AllQuestionArr[i].children[j].question[k].SubQuestionList[m].Combination_index = m + 1
                jsonObj.AllQuestionArr[i].children[j].question[k].SubQuestionList[m].Explain= jsonObj.AllQuestionArr[i].children[j].question[k].Explain
                jsonObj.AllQuestionArr[i].children[j].question[k].SubQuestionList[m].Analysis = jsonObj.AllQuestionArr[i].children[j].question[k].Analysis
                jsonObj.AllQuestionArr[i].children[j].question[k].SubQuestionList[m].Comments = jsonObj.AllQuestionArr[i].children[j].question[k].Comments
                jsonObj.AllQuestionArr[i].children[j].question[k].SubQuestionList[m].Special_topics = jsonObj.AllQuestionArr[i].children[j].question[k].Special_topics
                jsonObj.AllQuestionArr[i].children[j].question[k].SubQuestionList[m].Examination_points = jsonObj.AllQuestionArr[i].children[j].question[k].Examination_points
                jsonObj.AllQuestionArr[i].children[j].question[k].SubQuestionList[m].Knowledge_points = jsonObj.AllQuestionArr[i].children[j].question[k].Knowledge_points
              }
            }
          }
        }
      }
    }
  }
  if(!jsonObj.Term){
    lackJsonObj.titleArr.push(`适用学期：${jsonObj.Term}不和要求，不能为空`)
  }
  if(jsonObj.Papertype !== '套卷'){
    lackJsonObj.titleArr.push(`试卷类型：${jsonObj.Papertype}不和要求，只能为套卷`)
  }
  if(/^\s*\d(\.\d+)?/.test(jsonObj.Division)){
    if(!(jsonObj.Division < 1 && jsonObj.Division > 0)){
      lackJsonObj.titleArr.push(`区分度：${jsonObj.Division}不和要求，应为0到1数值`)
    }
  }else{
    lackJsonObj.titleArr.push(`区分度：${jsonObj.Division}不和要求，应为0到1数值`)
  }
  if(!/^\s*\d+\s*$/.test(jsonObj.DiffcultyType)){
    lackJsonObj.titleArr.push(`难度方案：${jsonObj.DiffcultyType}不和要求，应为整数值`)
  }
  if(/^\s*\d(\.\d+)?/.test(jsonObj.Difficulty)){
    if(!(jsonObj.Difficulty < 1 && jsonObj.Difficulty > 0)){
      lackJsonObj.titleArr.push(`难度：${jsonObj.Difficulty}不和要求，应为0到1数值`)
    }
  }else{
    lackJsonObj.titleArr.push(`难度：${jsonObj.Difficulty}不和要求，应为0到1的数值`)
  }
  if(lackJsonObj.titleArr.length > 0 || lackJsonObj.examPointsArr.length > 0){
    lackJsonObj.fileName = jsonObj.fileName
  }
  if(lackJsonObj.fileName){
    lackArr.push(lackJsonObj)
  }else{
    jsonArr.push(jsonObj)
  }
}

//处理htmlToJson函数
function htmlToJson(res, originArr, myEmitter) {
  let docxArr = []
  let dir = originArr[0].dir
  for (let i = 0, len = originArr.length; i < len; i++) {
    docxArr.push(originArr[i].path)
  }
  let jsonArr = [], errArr = [], lackArr = []  //成功解析和失败解析以及成功解析但是缺少必要属性的列表
  for (let i = 0, len = docxArr.length; i < len; i++) {
    let jsonObj = {
      Title: '',
      Attribute: '',
      Material: '',
      Subject: '',
      Term: '',
      TotalPoints: '',
      Time: '',
      Papertype: '',
      Papersource: '',
      Core: '',
      Synchronization: '',
      Douthree: '',
      IsHide: '',
      IsTrue: '',
      Division: '',
      Spenttime: '',
      DiffcultyType: '',
      Difficulty: '',
      ScopeDataStr: '',
      localId: '',
      AllQuestionArr: []
    }  //单个试卷的json对象
    jsonObj.fileName = path.basename(docxArr[i], '.docx')
    let primaryStr = '' //p标签中的内容
    let curItemType = 'title' //分为 title single multiple blank resolve
    let itemTypeNum = 1 //1 单项选择题 2 多项选择题 3 填空题 4 解答题 5 判断题 6 题组题
    let hasSubItem = false  //是否是题组题
    let curItemProperty = '' //分为 choice Examination_points Special_topics Explain Analysis Comments SubItem Item
    let curLabel = 'p'  //当前的标签
    let removeAnswer = false //是否去除下划线上的文字
    mammoth.convertToHtml({path: docxArr[i]}, {
      styleMap: [
        "u => u",
        "p [style-name='Section Title'] => h1",
        //"p [style-name='Subsection Title'] => h2",
        "p [style-name='Heading 3'] => h3",
        "p [style-name='Heading 4'] => h4",
        "p [style-name='Heading 2'] => h2"
      ]
    }).then(result => {
      let temp = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Title</title><style>table.defaultTableStyle { border-collapse: collapse; text-align: center; margin: 2px; }table.defaultTableStyle th, table.defaultTableStyle td { line-height: 30px; padding: 5px; white-space: normal; word-break: break-all; border: 1px solid #000; vertical-align: middle; }</style></head><body>${result.value}</body></html>`;
      let {document} = new JSDOM(temp).window;
      let global = {};
      global.document = document;
      let window = document.defaultView;
      let $ = require('jquery')(window);
      for (let i = 0, len = $(document.body).children().length; i < len; i++) {
        if (jsonObj.Subject.includes('英语')) {
          primaryStr = filterAnswer($(document.body).children()[i].innerHTML)
        } else {
          primaryStr = $(document.body).children()[i].innerHTML
        }
        primaryStr = primaryStr.replace(/(菁优网版权所有)|(菁优网：http:\/\/www\.jyeoo\.com)|(菁优网)|(http:\/\/www\.jyeoo\.com)/g, '')
        //整行为空时跳过
        if (!primaryStr) {
          continue
        }
        //匹配到##end时结束匹配
        if (dealSpace('end').test(primaryStr)) {
          console.log('break 执行了！！！！')
          break
        }
        if(/^\s*#start#$/.test(primaryStr)){
          removeAnswer = true
          continue
        }
        if(/^\s*#end#/.test(primaryStr)){
          removeAnswer = false
          continue
        }
        //处理题的类型
        if (/^#\d+#$/.test(primaryStr)) {
          itemTypeNum = getItemType(primaryStr, itemTypeNum)
          continue
        }
        if ($(document.body).children()[i].tagName.toLowerCase() == 'p' || $(document.body).children()[i].tagName.toLowerCase() == 'table') {
          curLabel = 'p'
          if ($(document.body).children()[i].tagName.toLowerCase() == 'table') {
            curLabel = 'table'
            primaryStr = '<table class="defaultTableStyle">' + primaryStr + '</table>'
          }
          //先判断标题的一些信息
          if (/^\s*#\s*#/.test(primaryStr)) {
            curItemType = 'title'
            if (dealSpace('试卷名称').test(primaryStr)) {
              jsonObj.Title = getTitleInfo('试卷名称', primaryStr)
              continue
            }
            if (dealSpace('试卷属性').test(primaryStr)) {
              jsonObj.Attribute = getTitleInfo('试卷属性', primaryStr)
              continue
            }
            if (dealSpace('教材版本').test(primaryStr)) {
              jsonObj.Material = getTitleInfo('教材版本', primaryStr)
              continue
            }
            if (dealSpace('学段学科').test(primaryStr)) {
              jsonObj.Subject = getTitleInfo('学段学科', primaryStr)
              continue
            }
            if (dealSpace('适用学期').test(primaryStr)) {
              jsonObj.Term = getTitleInfo('适用学期', primaryStr)
              continue
            }
            if (dealSpace('试卷总分值').test(primaryStr)) {
              jsonObj.TotalPoints = getTitleInfo('试卷总分值', primaryStr)
              continue
            }
            if (dealSpace('建议答题时长').test(primaryStr)) {
              jsonObj.Time = getTitleInfo('建议答题时长', primaryStr)
              continue
            }
            if (dealSpace('试卷类型').test(primaryStr)) {
              jsonObj.Papertype = getTitleInfo('试卷类型', primaryStr)
              continue
            }
            if (dealSpace('试卷来源').test(primaryStr)) {
              jsonObj.Papersource = getTitleInfo('试卷来源', primaryStr)
              continue
            }
            if (dealSpace('核心题库').test(primaryStr)) {
              jsonObj.Core = getTitleInfo('核心题库', primaryStr)
              continue
            }
            if (dealSpace('同步试题').test(primaryStr)) {
              jsonObj.Synchronization = getTitleInfo('同步试题', primaryStr)
              continue
            }
            if (dealSpace('双三试题').test(primaryStr)) {
              jsonObj.Douthree = getTitleInfo('双三试题', primaryStr)
              continue
            }
            if (dealSpace('是否隐藏').test(primaryStr)) {
              jsonObj.IsHide = getTitleInfo('是否隐藏', primaryStr)
              continue
            }
            if (dealSpace('是否正确').test(primaryStr)) {
              jsonObj.IsTrue = getTitleInfo('是否正确', primaryStr)
              continue
            }
            if (dealSpace('区分度').test(primaryStr)) {
              jsonObj.Division = getTitleInfo('区分度', primaryStr)
              continue
            }
            if (dealSpace('答题时间').test(primaryStr)) {
              jsonObj.Spenttime = getTitleInfo('答题时间', primaryStr)
              continue
            }
            if (dealSpace('难度方案').test(primaryStr)) {
              jsonObj.DiffcultyType = getTitleInfo('难度方案', primaryStr)
              continue
            }
            if (dealSpace('难度').test(primaryStr)) {
              jsonObj.Difficulty = getTitleInfo('难度', primaryStr)
              continue
            }
          } else {
            if (itemTypeNum == 1 || itemTypeNum == 2) {
              if (judgeIsOption(primaryStr)) {
                curItemProperty = 'choice'
                dealOptions(jsonObj, primaryStr, hasSubItem)
                continue
              }
            }
            if (dealBracket('考点').test(primaryStr)) {
              hasSubItem = false
              curItemProperty = 'Examination_points'
              let value = getItemProperty('考点', primaryStr)
              dealProperty(jsonObj, curItemProperty, value)
            } else if (dealBracket('专题').test(primaryStr)) {
              curItemProperty = 'Special_topics'
              let value = getItemProperty('专题', primaryStr)
              dealProperty(jsonObj, curItemProperty, value)
            } else if (dealBracket('解答').test(primaryStr)) {
              curItemProperty = 'Explain'
              let value = '<p>' + getItemProperty('解答', primaryStr) + '</p>'
              dealProperty(jsonObj, curItemProperty, value)
            } else if (dealBracket('分析').test(primaryStr)) {
              curItemProperty = 'Analysis'
              let value = '<p>' + getItemProperty('分析', primaryStr) + '</p>'
              dealProperty(jsonObj, curItemProperty, value)
            } else if (dealBracket('点评').test(primaryStr)) {
              curItemProperty = 'Comments'
              let value = '<p>' + getItemProperty('点评', primaryStr) + '</p>'
              dealProperty(jsonObj, curItemProperty, value)
            } else {
              if (curItemProperty == 'choice') {
                dealOptions(jsonObj, primaryStr, hasSubItem, true)
              } else if (curItemProperty == 'Examination_points') {
                let value = primaryStr
                dealProperty(jsonObj, curItemProperty, value, true)
              } else if (curItemProperty == 'Special_topics') {
                let value = primaryStr
                dealProperty(jsonObj, curItemProperty, value, true)
              } else if (curItemProperty == 'Explain') {
                let value = '<p>' + primaryStr + '</p>'
                dealProperty(jsonObj, curItemProperty, value, true)
              } else if (curItemProperty == 'Analysis') {
                let value = '<p>' + primaryStr + '</p>'
                dealProperty(jsonObj, curItemProperty, value, true)
              } else if (curItemProperty == 'Comments') {
                let value = '<p>' + primaryStr + '</p>'
                dealProperty(jsonObj, curItemProperty, value, true)
              } else if (curItemProperty == 'Item') {
                dealItem('Item', jsonObj, primaryStr, removeAnswer)
              } else if (curItemProperty == 'SubItem') {
                dealItem('SubItem', jsonObj, primaryStr, removeAnswer)
              }
            }
          }
        } else if ($(document.body).children()[i].tagName.toLowerCase() == 'h1') {
          if (curLabel != 'h1') {
            let part = {
              text: '<p>' + primaryStr + '</p>',
              children: [],
              question: [],
              rangeMin: '',
              rangeMax: '',
              hasChild: '0'
            }
            jsonObj.AllQuestionArr.push(part)
          } else {
            jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].text += '<p>' + primaryStr + '</p>>'
          }
          curLabel = 'h1'
        } else if ($(document.body).children()[i].tagName.toLowerCase() == 'h2') {
          if (curLabel != 'h2') {
            let brief = {
              text: '<p>' + primaryStr + '</p>',
              hasChild: '0',
              rangeMin: '',
              rangeMax: '',
              children: [],
              question: []
            }
            jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.push(brief)
            jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild = '1'
          } else {
            jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].text += '<p>' + primaryStr + '</p>'
          }
          curLabel = 'h2'
        } else if ($(document.body).children()[i].tagName.toLowerCase() == 'h4') {
          if (!hasSubItem) {
            //非题组题
            curItemProperty = 'Item'
            if (/^\d+(\.|。|．)/.test(primaryStr)) {
              let itemObj = {
                Question_Id: '',
                Num: '',
                Serial_num: getItemNum(primaryStr),
                Fid: '',
                Score: getScore(primaryStr),
                Type: itemTypeNum,
                Core: jsonObj.Core,
                Synchronization: jsonObj.Synchronization,
                Douthree: jsonObj.Douthree,
                Hide: jsonObj.IsHide,
                Correct: jsonObj.IsTrue,
                Checnote: '',
                Text: getItemDes(primaryStr) ? '<p>' + getItemDes(primaryStr) + '</p>' : '',
                Options: [],
                Knowledge_points: [],
                Explain: '',
                Analysis: '',
                Answer: '',
                Comments: '',
                Division: jsonObj.Division,
                Difficulty: jsonObj.Difficulty,
                Spenttime: jsonObj.Spenttime,
                Special_topics: '',
                Ability: '',
                Thoughtway: '',
                Examination_points: '',
                From: jsonObj.Papersource,
                IsCombination: 0,
                SubQuestionList: [],
                Knowledge_main_point: '',
                UseTag: ''
              }
              if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '0') {
                jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question.push(itemObj)
              } else if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '1') {
                jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length - 1].question.push(itemObj)
              }
            } else {
              if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '0') {
                let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question.length
                jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].Text += '<p>' + primaryStr + '</p>'
              } else if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '1') {
                let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length - 1].question.length
                jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length - 1].question[qLength - 1].Text += '<p>' + primaryStr + '</p>'
              }
            }
          } else {
            //处理题组题的小题
            curItemProperty = 'SubItem'
            if (getSubItemNum(primaryStr)) {
              let subItemObj = {
                Question_Id: '',
                Num: '',
                Serial_num: getSubItemNum(primaryStr),
                Fid: '',
                Score: getSubScore(primaryStr),
                Type: itemTypeNum,
                Core: jsonObj.Core,
                Synchronization: jsonObj.Synchronization,
                Douthree: jsonObj.Douthree,
                Hide: jsonObj.IsHide,
                Correct: jsonObj.IsTrue,
                Checnote: '',
                Text: getSubItemDes(primaryStr) ? '<p>' + getSubItemDes(primaryStr) + '</p>' : '',
                Options: [],
                Knowledge_points: [],
                Explain: '',
                Analysis: '',
                Answer: '',
                Comments: '',
                Division: jsonObj.Division,
                Difficulty: jsonObj.Difficulty,
                Spenttime: jsonObj.Spenttime,
                Special_topics: '',
                Ability: '',
                Thoughtway: '',
                Examination_points: '',
                From: jsonObj.Papersource,
                IsCombination: 0,
                SubQuestionList: [],
                Knowledge_main_point: '',
                UseTag: '',
                Combination_index: ''
              }
              if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '0') {
                let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question.length
                jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].SubQuestionList.push(subItemObj)
              } else if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '1') {
                let briefLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length
                let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question.length
                jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].SubQuestionList.push(subItemObj)
              }
            } else {
              if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '0') {
                let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question.length
                let subQuestionLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].SubQuestionList.length
                jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].SubQuestionList[subQuestionLength - 1].Text += '<p>' + primaryStr + '</p>'
              } else if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '1') {
                let briefLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length
                let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question.length
                let subQuestionLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].SubQuestionList.length
                jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[briefLength - 1].question[qLength - 1].SubQuestionList[subQuestionLength - 1].Text += '<p>' + primaryStr + '</p>'
              }
            }
          }
          curLabel = 'h4'
        } else if ($(document.body).children()[i].tagName.toLowerCase() == 'h3') {
          //题组题
          curItemProperty = 'Item'
          hasSubItem = true
          if (/^\d+(\.|。|．)/.test(primaryStr)) {
            let itemObj = {
              Question_Id: '',
              Num: '',
              Serial_num: getItemNum(primaryStr),
              Fid: '',
              Score: getScore(primaryStr),
              Type: '6',
              Core: jsonObj.Core,
              Synchronization: jsonObj.Synchronization,
              Douthree: jsonObj.Douthree,
              Hide: jsonObj.IsHide,
              Correct: jsonObj.IsTrue,
              Checnote: '',
              Text: '<p>' + getItemDes(primaryStr) + '</p>',
              Options: [],
              Knowledge_points: [],
              Explain: '',
              Analysis: '',
              Answer: '',
              Comments: '',
              Division: jsonObj.Division,
              Difficulty: jsonObj.Difficulty,
              Spenttime: jsonObj.Spenttime,
              Special_topics: '',
              Ability: '',
              Thoughtway: '',
              Examination_points: '',
              From: jsonObj.Papersource,
              //为题组题所添加的属性
              IsCombination: 1,
              SubQuestionList: [],
              Knowledge_main_point: '',
              UseTag: ''
            }
            if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '0') {
              jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question.push(itemObj)
            } else if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '1') {
              jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length - 1].question.push(itemObj)
            }
          } else {
            if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '0') {
              let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question.length
              jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].question[qLength - 1].Text += '<p>' + primaryStr + '</p>'
            } else if (jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].hasChild == '1') {
              let qLength = jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length - 1].question.length
              jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children[jsonObj.AllQuestionArr[jsonObj.AllQuestionArr.length - 1].children.length - 1].question[qLength - 1].Text += '<p>' + primaryStr + '</p>'
            }
          }
          curLabel = 'h3'
        }
      }
      jsonObj.localId = new Date().getTime()
      dealJsonObj(jsonObj, jsonArr, lackArr)
      myEmitter.emit('jsonObjSuccess', {jsonObj, temp})
      if ((jsonArr.length + errArr.length + lackArr.length) === docxArr.length) {
        myEmitter.emit('success', {dir})
        res.send({
          jsonArr,
          errArr,
          lackArr
        })
      }
    })
      .catch(err => {
        console.log(err)
        myEmitter.emit('error', {jsonObj})
        errArr.push({index: i, path: docxArr[i], fileName: path.basename(docxArr[i], '.docx')})
        if ((jsonArr.length + errArr.length + lackArr.length) === docxArr.length) {
          myEmitter.emit('success', {dir})
          res.send({
            jsonArr,
            errArr,
            lackArr
          })
        }
      })
  }
}


module.exports.htmlToJson = htmlToJson

