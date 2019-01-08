const mammoth = require('mammoth');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const path = require('path');
const fs = require('fs');
const subjectAboutInfo = require('../json/subjectAboutInfo.json').subjectAboutInfo




let choiceList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

//处理空格
function dealSpace(str) {
  let temp_arr = String(str).replace(/\s*/g, '').split('');
  let reg_str = "^\\s*#\\s*#\\s*";
  for (let i = 0, len = temp_arr.length; i < len; i++) {
    reg_str = reg_str + temp_arr[i] + "\\s*"
  }
  if(str !== '适用学期'){
    reg_str += "(:|：)?"
  }else{
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
function getItemProperty(str, primaryStr, jsonObj, index) {
  if (str !== '考点') {
    return primaryStr.replace(dealBracket(str), '').trim()
  } else {
    let tempArr = primaryStr.replace(dealBracket(str), '').replace(/\s*/g, '').replace(/(．\S*|\.\S*|。\S*)/, '').replace(/:/g, '：').replace(/;/g, '；').split('；'),
      ExaminationPoints = []
    for (let i = 0, len = tempArr.length; i < len; i++) {
      ExaminationPoints.push(tempArr[i].split('：')[1])
    }
    let knowledgePointList = []
    let ExaminationPointsName = []
    //高中数学（文/理）特殊处理
    if(jsonObj.Subject.includes('高中数学')){
      for(let i = 0, len = subjectAboutInfo.length; i < len; i++){
        if(subjectAboutInfo[i].subjectName.includes('高中数学')){
          knowledgePointList = knowledgePointList.concat(subjectAboutInfo[i].knowledgePointList)
        }
      }
    }else{
      for(let i = 0, len = subjectAboutInfo.length; i < len; i++){
        if(jsonObj.Subject == subjectAboutInfo[i].subjectName){
          knowledgePointList = subjectAboutInfo[i].knowledgePointList
          break
        }
      }
    }
    let arr = []
    if(ExaminationPoints.length > 0){
      for(let i = 0, len = ExaminationPoints.length; i < len; i++){
        for(let j = 0, len2 = knowledgePointList.length; j < len2; j++){
          if(ExaminationPoints[i] == knowledgePointList[j].pointName){
            arr.push(knowledgePointList[j].pointFid)
            ExaminationPointsName.push(knowledgePointList[j].pointName)
            break
          }
        }
      }
    }
    jsonObj.question[index].ExaminationPointsName = ExaminationPointsName
    return arr
  }
}

//获取题号
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

//获取题干信息
function getItemDes(primaryStr) {
  let reg = /^\s*\d+\s*(\.|。|．)\s*((\(|（)\s*(\d+|\d+(\.|。|．)\d+)\s*分\s*(\)|）))?/;
  if (primaryStr.match(reg)) {
    return primaryStr.replace(reg, '').trim()
  } else {
    return ''
  }
}

//获取分数
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

//处理题组题小题的一些属性问题
function dealSubQuestion(jsonObj) {
  //如果上一题是题组题，为上一题的小题添加应该有的属性
  if (jsonObj.question.length > 0 && jsonObj.question[jsonObj.question.length - 1].SubQuestionList.length > 0) {
    for (let i = 0, len = jsonObj.question[jsonObj.question.length - 1].SubQuestionList.length; i < len; i++) {
      jsonObj.question[jsonObj.question.length - 1].SubQuestionList[i].Explain = jsonObj.question[jsonObj.question.length - 1].Explain
      jsonObj.question[jsonObj.question.length - 1].SubQuestionList[i].Analysis = jsonObj.question[jsonObj.question.length - 1].Analysis
      jsonObj.question[jsonObj.question.length - 1].SubQuestionList[i].Comments = jsonObj.question[jsonObj.question.length - 1].Comments
      jsonObj.question[jsonObj.question.length - 1].SubQuestionList[i].Special_topics = jsonObj.question[jsonObj.question.length - 1].Special_topics
      jsonObj.question[jsonObj.question.length - 1].SubQuestionList[i].Examination_points = jsonObj.question[jsonObj.question.length - 1].Examination_points
    }
  }
}



function htmlToJson(res, originArr, myEmitter) {
  let docxArr = []
  let dir = originArr[0].dir
  for(let i = 0, len = originArr.length; i < len; i++){
    docxArr.push(originArr[i].path)
  }
  let jsonArr = [], errArr = []  //成功解析和失败解析的列表
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
      localId: '',
      question: []
    }  //单个试卷的json对象
    let primaryStr = '' //p标签中的内容
    let curItemType = 'title' //分为 title single multiple blank resolve
    let itemTypeNum = 0 //1 单项选择题 2 多项选择题 3 填空题 4 解答题
    let hasSubItem = false  //是否是题组题
    let curItemProperty = '' //分为 choice Examination_points Special_topics Explain Analysis Comments
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
        primaryStr = $(document.body).children()[i].innerHTML
        //整行为空时跳过
        if (!primaryStr) {
          continue
        }
        //匹配到##end时结束匹配
        if (dealSpace('end').test(primaryStr)) {
          console.log('break 执行了！！！！')
          break
        }
        if ($(document.body).children()[i].tagName.toLowerCase() == 'p' || $(document.body).children()[i].tagName.toLowerCase() == 'table') {
          if ($(document.body).children()[i].tagName.toLowerCase() == 'table') {
            primaryStr = '<table class="defaultTableStyle">' + primaryStr + '</table>'
          }
          //除了(h3和紧连着h3的h4)时为题组题状态其他则为非题组题状态
          hasSubItem = false
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
                jsonObj.question[jsonObj.question.length - 1].Options.push(dealChoice(primaryStr))
                continue
              }
            }
            if (dealBracket('考点').test(primaryStr)) {
              let index = jsonObj.question.length - 1
              curItemProperty = 'Examination_points'
              jsonObj.question[jsonObj.question.length - 1].Examination_points = getItemProperty('考点', primaryStr, jsonObj, index)
            } else if (dealBracket('专题').test(primaryStr)) {
              curItemProperty = 'Special_topics'
              jsonObj.question[jsonObj.question.length - 1].Special_topics = getItemProperty('专题', primaryStr)
            } else if (dealBracket('分析').test(primaryStr)) {
              curItemProperty = 'Explain'
              jsonObj.question[jsonObj.question.length - 1].Explain = '<p>' + getItemProperty('分析', primaryStr) + '</p>'
            } else if (dealBracket('解答').test(primaryStr)) {
              curItemProperty = 'Analysis'
              jsonObj.question[jsonObj.question.length - 1].Analysis = '<p>' + getItemProperty('解答', primaryStr) + '</p>'
            } else if (dealBracket('点评').test(primaryStr)) {
              curItemProperty = 'Comments'
              jsonObj.question[jsonObj.question.length - 1].Comments = '<p>' + getItemProperty('点评', primaryStr) + '</p>'
            } else {
              if (curItemProperty == 'choice') {
                jsonObj.question[jsonObj.question.length - 1].Options[jsonObj.question[jsonObj.question.length - 1].Options.length - 1].Text += '<p>' + primaryStr + '</p>'
              } else if (curItemProperty == 'Examination_points') {
                jsonObj.question[jsonObj.question.length - 1].Examination_points += '<p>' + primaryStr + '</p>'
              } else if (curItemProperty == 'Special_topics') {
                jsonObj.question[jsonObj.question.length - 1].Special_topics += '<p>' + primaryStr + '</p>'
              } else if (curItemProperty == 'Explain') {
                jsonObj.question[jsonObj.question.length - 1].Explain += '<p>' + primaryStr + '</p>'
              } else if (curItemProperty == 'Analysis') {
                jsonObj.question[jsonObj.question.length - 1].Analysis += '<p>' + primaryStr + '</p>'
              } else if (curItemProperty == 'Comments') {
                jsonObj.question[jsonObj.question.length - 1].Comments += '<p>' + primaryStr + '</p>'
              }
            }
          }
        } else if ($(document.body).children()[i].tagName.toLowerCase() == 'h2') {
          //判断题型
          if (/单项选择题/g.test(primaryStr)) {
            curItemType = 'single'
            itemTypeNum = 1
          } else if (/多项选择题/g.test(primaryStr)) {
            curItemType = 'multiple'
            itemTypeNum = 2
          } else if (/填空题/.test(primaryStr)) {
            curItemType = 'blank'
            itemTypeNum = 3
          } else if (/解答题/.test(primaryStr)) {
            curItemType = 'resolve'
            itemTypeNum = 4
          }
        } else if ($(document.body).children()[i].tagName.toLowerCase() == 'h4') {
          if (!hasSubItem) {
            //非题组题
            if (/^\d+(\.|。|．)/.test(primaryStr)) {
              dealSubQuestion(jsonObj)
              let itemObj = {
                Question_Id: '',
                Num: getItemNum(primaryStr),
                Index: jsonObj.question.length + 1,
                Fid: '',
                Score: getScore(primaryStr),
                Type: itemTypeNum,
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
                HasSubQuestion: false,
                SubQuestionList: []
              }
              jsonObj.question.push(itemObj)
            } else {
              jsonObj.question[jsonObj.question.length - 1].Text += '<p>' + primaryStr + '</p>'
            }
          } else {
            //处理题组题的小题
            let subItemObj = {
              Question_Id: '',
              Num: '',
              Index: jsonObj.question[jsonObj.question.length - 1].SubQuestionList.length + 1,
              Fid: '',
              Score: '',
              Type: itemTypeNum,
              Core: jsonObj.Core,
              Synchronization: jsonObj.Synchronization,
              Douthree: jsonObj.Douthree,
              Hide: jsonObj.IsHide,
              Correct: jsonObj.IsTrue,
              Checnote: '',
              Text: '<p>' + primaryStr + '</p>',
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
              From: jsonObj.Papersource
            }
            jsonObj.question[jsonObj.question.length - 1].SubQuestionList.push(subItemObj)
          }
        } else if ($(document.body).children()[i].tagName.toLowerCase() == 'h3') {
          //题组题
          hasSubItem = true
          if (/^\d+(\.|。|．)/.test(primaryStr)) {
            dealSubQuestion(jsonObj)
            let itemObj = {
              Question_Id: '',
              Num: getItemNum(primaryStr),
              Index: jsonObj.question.length + 1,
              Fid: '',
              Score: getScore(primaryStr),
              Type: itemTypeNum,
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
              HasSubQuestion: true,
              SubQuestionList: []
            }
            jsonObj.question.push(itemObj)
          } else {
            jsonObj.question[jsonObj.question.length - 1].Text += '<p>' + primaryStr + '</p>'
          }
        }
      }
      dealSubQuestion(jsonObj)
      jsonObj.localId = new Date().getTime()
      jsonObj.fileName = path.basename(docxArr[i], '.docx')
      jsonArr.push(jsonObj)
      if((jsonArr.length + errArr.length) === docxArr.length){
        myEmitter.emit('success', {dir})
        res.send({
          jsonArr,
          errArr
        })
      }
    })
      .catch(err => {
        console.log(err)
        errArr.push({index: i, path: docxArr[i], fileName: path.basename(docxArr[i], '.docx')})
        if((jsonArr.length + errArr.length) === docxArr.length){
          myEmitter.emit('success', {dir})
          res.send({
            jsonArr,
            errArr
          })
        }
      })
  }
}


module.exports.htmlToJson = htmlToJson

