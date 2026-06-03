// BottleBoat Receiver — Proportional Rudder (−100..100 → ±MAX) + Throttle (jellystem)
// 
// Half stick = half angle; full stick = MAX_RUDDER_ANGLE
function clamp (v: number, lo: number, hi: number) {
    if (v < lo) {
        return lo
    }
    if (v > hi) {
        return hi
    }
    return v
}
radio.onReceivedString(function (msg) {
    rx = msg
    parts = rx.split(",")
    if (parts.length == 3) {
        arm = parseInt(parts[0])
        // expected range −100..+100
        joyX = parseInt(parts[1])
        joyY = parseInt(parts[2])
    }
})
let nextWriteAt = 0
let now = 0
let joyY = 0
let arm = 0
let parts: string[] = []
let rx = ""
let mag = 0
let joyX = 0
let RADIO_GROUP = 200
radio.setGroup(RADIO_GROUP)
// ===== USER SETTINGS =====
// "CW" or "CCW"
let Forward_direction_motor = "CW"
let MIN_THROTTLE = 20
// any neutral you need
let RUDDER_CENTER = 95
// ± from center (deg)
let MAX_RUDDER_ANGLE = 45
// small deadband
let X_DEAD = 3
// write only if ≥ this many deg change
let ANGLE_EPS = 1
// min time between writes near target
let WRITE_RATE_MS = 100
// loop delay
let PAUSE_MS = 10
let fwdDirUse = jellystem.MotorsDirection.CC
let revDirUse = jellystem.MotorsDirection.CCW
let rudderAngle = RUDDER_CENTER
let target = RUDDER_CENTER
let minAngle = RUDDER_CENTER - MAX_RUDDER_ANGLE
let maxAngle = RUDDER_CENTER + MAX_RUDDER_ANGLE
let lastAngleCmd = RUDDER_CENTER
// init
jellystem.wheelStop(jellystem.Motors.AllMotors)
jellystem.setS1ToS4Type(jellystem.S1ToS4Type.Servo)
jellystem.extendServoControl(jellystem.PwmAndServoIndex.S4, jellystem.ServoType.Servo180, RUDDER_CENTER)
basic.showString("RXV1-" + RADIO_GROUP)
basic.forever(function () {
    // map "CW"/"CCW"
    if (Forward_direction_motor == "CCW" || Forward_direction_motor == "ccw") {
        fwdDirUse = jellystem.MotorsDirection.CCW
revDirUse = jellystem.MotorsDirection.CC
    } else {
        fwdDirUse = jellystem.MotorsDirection.CC
revDirUse = jellystem.MotorsDirection.CCW
    }
    // arm LED
    if (arm) {
        led.plot(2, 2)
    } else {
        led.unplot(2, 2)
    }
    // ===== RUDDER: linear map from −100..100 to ±MAX_RUDDER_ANGLE =====
    minAngle = RUDDER_CENTER - MAX_RUDDER_ANGLE
    maxAngle = RUDDER_CENTER + MAX_RUDDER_ANGLE
    let xCmd = (Math.abs(joyX) <= X_DEAD) ? 0 : clamp(joyX, -100, 100)
// proportional mapping: ±100 → ±MAX_RUDDER_ANGLE
    target = RUDDER_CENTER + Math.idiv(xCmd * MAX_RUDDER_ANGLE, 100)
    // clamp final servo angle
    target = clamp(target, minAngle, maxAngle)
    target = clamp(target, 0, 180)
    // write only if meaningfully changed or timer expired
    now = control.millis()
    if (Math.abs(target - lastAngleCmd) >= ANGLE_EPS || now >= nextWriteAt) {
        rudderAngle = target
        jellystem.extendServoControl(jellystem.PwmAndServoIndex.S4, jellystem.ServoType.Servo180, rudderAngle)
        lastAngleCmd = rudderAngle
        nextWriteAt = now + WRITE_RATE_MS
    }
    // ===== THROTTLE from Y =====
    if (arm) {
        mag = Math.abs(joyY)
        if (mag > 100) {
            mag = 100
        }
        if (mag == 0) {
            jellystem.wheelStop(jellystem.Motors.AllMotors)
        } else {
            if (mag < MIN_THROTTLE) {
                mag = MIN_THROTTLE
            }
            if (joyY < 0) {
                jellystem.setMotorsDirectionSpeed(jellystem.Motors.AllMotors, fwdDirUse, mag)
            } else {
                jellystem.setMotorsDirectionSpeed(jellystem.Motors.AllMotors, revDirUse, mag)
            }
        }
    } else {
        jellystem.wheelStop(jellystem.Motors.AllMotors)
    }
    basic.pause(PAUSE_MS)
})
