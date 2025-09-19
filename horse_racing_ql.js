/**
 * 马匹竞赛自动化脚本 - 青龙面板版
 * 
 * 环境变量说明:
 * HORSE_RACING_COOKIE: 必需，登录Cookie
 * MIN_PRIZE_POOL: 可选，最小奖池金额，默认50000
 * MIN_BALANCE: 可选，最小余额要求，默认3000
 * MAX_BETS: 可选，最大下注次数，默认3
 * ENABLE_DELAY: 可选，是否启用随机延迟，默认true，设置为false可关闭延迟
 * 
 * cron: 5,25,45 7-23 * * *  (每天7点-23点的5，25，45分执行)
 * 
 * 注意: 本脚本使用 Node.js 内置的 fetch API (Node.js 18+ 支持)，无需安装 node-fetch 依赖
 */

// Node.js 18+ 内置 fetch，无需额外依赖

class HorseRacingBot {
    constructor() {
        // 检查 fetch API 可用性
        if (typeof fetch === 'undefined') {
            console.log('❌ 当前 Node.js 版本不支持内置 fetch API');
            console.log('💡 请升级到 Node.js 18+ 或安装 node-fetch@2.x');
            process.exit(1);
        }
        
        this.baseURL = 'https://13city.org/horse_racing.php';
        
        // 从环境变量获取配置
        this.cookie = process.env.HORSE_RACING_COOKIE;
        this.minPrizePool = parseInt(process.env.MIN_PRIZE_POOL) || 50000;
        this.minBalance = parseInt(process.env.MIN_BALANCE) || 3000;
        this.maxBets = parseInt(process.env.MAX_BETS) || 3;
        this.enableDelay = process.env.ENABLE_DELAY !== 'false'; // 默认启用延迟，除非明确设置为false
        
        // 检查必需的环境变量
        if (!this.cookie) {
            console.log('❌ 缺少必需的环境变量 HORSE_RACING_COOKIE');
            process.exit(1);
        }
        
        this.headers = {
            'accept': '*/*',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,eo;q=0.7',
            'cache-control': 'no-cache',
            'content-type': 'application/x-www-form-urlencoded',
            'pragma': 'no-cache',
            'priority': 'u=1, i',
            'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'cookie': this.cookie,
            'Referer': 'https://13city.org/horse_racing.php'
        };
        
        this.currentRaceId = null;
        this.usedHorseNumbers = new Set();
        
        // 青龙面板日志格式
        console.log('🏁 马匹竞赛自动化脚本 - 青龙面板版');
        console.log(`⚙️ 配置信息:`);
        console.log(`   最小奖池: ${this.minPrizePool}`);
        console.log(`   最小余额: ${this.minBalance}`);
        console.log(`   最大下注: ${this.maxBets}`);
        console.log(`   随机延迟: ${this.enableDelay ? '启用(3-12分钟)' : '禁用'}`);
        console.log('================================');
    }

    // 通用POST请求方法
    async makeRequest(body) {
        try {
            console.log(`📤 发送请求: ${body}`);
            
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: this.headers,
                body: body,
                timeout: 30000 // 30秒超时
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`📥 响应:`, JSON.stringify(data, null, 2));
            
            return data;
        } catch (error) {
            console.error(`❌ 请求失败:`, error.message);
            throw error;
        }
    }

    // 步骤1: 获取当前比赛信息
    async getCurrentRaceData() {
        console.log('\n🏁 步骤1: 获取当前比赛信息');
        
        try {
            const data = await this.makeRequest('action=get_current_race_data');
            
            if (!data.success) {
                console.log('❌ 获取当前比赛信息失败:', data.error || '未知错误');
                return false;
            }

            const { id, prize_pool, race_name, race_time, race_status } = data.data;
            console.log(`🏆 比赛信息: ${race_name} (ID: ${id})`);
            console.log(`💰 奖池金额: ${prize_pool}`);
            console.log(`⏰ 比赛时间: ${race_time}`);
            console.log(`📊 比赛状态: ${race_status}`);

            if (prize_pool >= this.minPrizePool) {
                console.log(`✅ 奖池金额 ${prize_pool} >= ${this.minPrizePool}，继续执行`);
                this.currentRaceId = id;
                return true;
            } else {
                console.log(`❌ 奖池金额 ${prize_pool} < ${this.minPrizePool}，结束执行`);
                return false;
            }
        } catch (error) {
            console.error('❌ 步骤1执行失败:', error.message);
            return false;
        }
    }

    // 步骤2: 获取核心数据
    async getCoreData() {
        console.log('\n📊 步骤2: 获取核心数据');
        
        try {
            const data = await this.makeRequest(`action=get_core_data&race_id=${this.currentRaceId}`);
            
            if (!data.success) {
                console.log('❌ 获取核心数据失败:', data.error || '未知错误');
                return false;
            }

            const { user_balance, prize_pool, total_bets, total_players, user_bets, race_status } = data.data;
            console.log(`💳 用户余额: ${user_balance}`);
            console.log(`🏆 奖池金额: ${prize_pool}`);
            console.log(`📈 总投注数: ${total_bets}`);
            console.log(`👥 总玩家数: ${total_players}`);
            console.log(`🎯 用户投注数: ${user_bets}`);
            console.log(`📊 比赛状态: ${race_status}`);

            if (user_balance > this.minBalance) {
                console.log(`✅ 用户余额 ${user_balance} > ${this.minBalance}，继续执行下注`);
                return true;
            } else {
                console.log(`❌ 用户余额 ${user_balance} <= ${this.minBalance}，结束执行`);
                return false;
            }
        } catch (error) {
            console.error('❌ 步骤2执行失败:', error.message);
            return false;
        }
    }

    // 生成1-24的随机马匹号码（避免重复）
    generateRandomHorseNumber() {
        let horseNumber;
        let attempts = 0;
        const maxAttempts = 50;
        
        do {
            horseNumber = Math.floor(Math.random() * 24) + 1;
            attempts++;
            
            if (attempts > maxAttempts) {
                console.log('⚠️ 生成随机数尝试次数过多，清空已使用列表');
                this.usedHorseNumbers.clear();
                break;
            }
        } while (this.usedHorseNumbers.has(horseNumber));
        
        this.usedHorseNumbers.add(horseNumber);
        return horseNumber;
    }

    // 步骤3: 下注
    async placeBets() {
        console.log(`\n🎯 步骤3: 执行下注（最多${this.maxBets}次）`);
        
        let successfulBets = 0;

        for (let i = 1; i <= this.maxBets; i++) {
            console.log(`\n🎲 第${i}次下注:`);
            
            try {
                const horseNumber = this.generateRandomHorseNumber();
                console.log(`🐎 选择马匹号码: ${horseNumber}`);
                
                const data = await this.makeRequest(
                    `action=place_bet&race_id=${this.currentRaceId}&horse_number=${horseNumber}&bet_count=1`
                );
                
                if (data.success) {
                    console.log(`✅ 下注成功！`);
                    console.log(`💰 新余额: ${data.newBalance}`);
                    console.log(`🏁 比赛ID: ${data.race_id}`);
                    successfulBets++;
                } else {
                    console.log(`❌ 下注失败: ${data.error || '未知错误'}`);
                    console.log('⚠️ 下注失败，停止重复执行');
                    break;
                }
                
                // 短暂延迟
                if (i < this.maxBets) {
                    const randomDelay = Math.floor(Math.random() * 1000) + 1000; // 1000-2000毫秒随机
                    const delaySeconds = (randomDelay / 1000).toFixed(1); // 转换为秒并保留1位小数
                    console.log(`⏱️ 等待${delaySeconds}秒后进行下一次下注...`);
                    await new Promise(resolve => setTimeout(resolve, randomDelay));
                }
                
            } catch (error) {
                console.error(`❌ 第${i}次下注执行失败:`, error.message);
                break;
            }
        }

        console.log(`📊 下注完成，成功次数: ${successfulBets}/${this.maxBets}`);
        return successfulBets > 0;
    }

    // 步骤4: 获取最终用户信息
    async getFinalUserInfo() {
        console.log('\n📈 步骤4: 获取最终用户信息');
        
        try {
            const data = await this.makeRequest(`action=get_core_data&race_id=${this.currentRaceId}`);
            
            if (!data.success) {
                console.log('❌ 获取最终用户信息失败:', data.error || '未知错误');
                return false;
            }

            const { user_balance, user_stats } = data.data;
            
            console.log('\n🎊 ===== 最终用户统计信息 =====');
            console.log(`💳 当前余额: ${user_balance}`);
            
            if (user_stats) {
                console.log(`🎯 总计下注: ${user_stats.total_bets || 'N/A'}`);
                console.log(`💰 总计投入: ${user_stats.total_wagered || 'N/A'}`);
                console.log(`🏆 总计赢取: ${user_stats.total_won || 'N/A'}`);
                console.log(`🎉 获胜次数: ${user_stats.win_count || 'N/A'}`);
            }
            
            console.log('================================\n');
            
            return true;
        } catch (error) {
            console.error('❌ 步骤4执行失败:', error.message);
            return false;
        }
    }

    // 主执行流程
    async run() {
        const scriptStartTime = new Date();
        let actualStartTime = new Date(); // 初始化为当前时间，稍后会更新
        
        console.log('🚀 马匹竞赛自动化脚本启动');
        console.log('⏰ 脚本启动时间:', scriptStartTime.toLocaleString());
        
        // 随机延迟3-12分钟启动（可通过环境变量控制）
        if (this.enableDelay) {
            const minDelay = 3 * 60 * 1000; // 3分钟 = 180000毫秒
            const maxDelay = 12 * 60 * 1000; // 12分钟 = 720000毫秒
            const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            const delayMinutes = Math.round(randomDelay / 60000 * 10) / 10; // 保留1位小数
            
            console.log(`⏳ 随机延迟启动: ${delayMinutes}分钟 (${randomDelay}ms)`);
            console.log(`🕐 预计执行时间: ${new Date(Date.now() + randomDelay).toLocaleString()}`);
            console.log('💤 延迟等待中...');
            
            // 显示延迟进度
            const progressInterval = setInterval(() => {
                const elapsed = Date.now() - scriptStartTime.getTime();
                const remaining = randomDelay - elapsed;
                if (remaining > 0) {
                    const remainingMinutes = Math.round(remaining / 60000 * 10) / 10;
                    console.log(`⏰ 剩余等待时间: ${remainingMinutes}分钟`);
                }
            }, 60000); // 每分钟打印一次剩余时间
            
            // 执行延迟
            await new Promise(resolve => setTimeout(resolve, randomDelay));
            
            // 清除进度显示
            clearInterval(progressInterval);
            
            actualStartTime = new Date(); // 更新实际开始时间
            console.log('✅ 延迟结束，开始执行核心逻辑');
            console.log('⏰ 实际开始时间:', actualStartTime.toLocaleString());
        } else {
            actualStartTime = scriptStartTime; // 如果没有延迟，实际开始时间就是脚本启动时间
            console.log('⚡ 跳过延迟，直接开始执行核心逻辑');
        }
        
        try {
            // 步骤1: 获取当前比赛信息
            const step1Success = await this.getCurrentRaceData();
            if (!step1Success) {
                console.log('🛑 流程结束：步骤1条件不满足');
                return;
            }

            // 步骤2: 获取核心数据
            const step2Success = await this.getCoreData();
            if (!step2Success) {
                console.log('🛑 流程结束：步骤2条件不满足');
                return;
            }

            // 步骤3: 执行下注
            await this.placeBets();

            // 步骤4: 获取最终用户信息
            await this.getFinalUserInfo();

            console.log('✅ 自动化脚本执行完成');
            
        } catch (error) {
            console.error('❌ 脚本执行过程中发生严重错误:', error.message);
            console.error('堆栈信息:', error.stack);
        } finally {
            const endTime = new Date();
            const totalDuration = endTime.getTime() - scriptStartTime.getTime();
            const executionDuration = endTime.getTime() - actualStartTime.getTime();
            console.log('⏰ 脚本结束时间:', endTime.toLocaleString());
            console.log(`⌛ 总耗时(含延迟): ${Math.round(totalDuration/1000)}秒 (${totalDuration}ms)`);
            console.log(`⚡ 实际执行耗时: ${Math.round(executionDuration/1000)}秒 (${executionDuration}ms)`);
        }
    }
}

// 执行脚本
const bot = new HorseRacingBot();
bot.run().catch(error => {
    console.error('❌ 脚本启动失败:', error.message);
    process.exit(1);
});
