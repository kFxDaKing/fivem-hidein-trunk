import { TrunkAnimation } from './Trunk.animation';
import { I18nLanguageConfig } from './config/I18nLanguage.config';
import { EtLanguageConfig } from './config/EtLanguage.config';

let inTrunk = false;
const language: I18nLanguageConfig = new EtLanguageConfig();
const DOOR_BOOT = 5;
const LOCK_UNLOCKED = 1;
const SEAT_DRIVER = -1;

function runWithTimeout(fn: Function, duration: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(fn());
        }, duration);
    });
}

function DrawText3D(coords: number[], text: string): void {
    const worldToMap = World3dToScreen2d(coords[0], coords[1], coords[2]);

    SetTextScale(0.4, 0.4);
    SetTextFont(4);
    SetTextEntry('STRING');
    SetTextCentre(true);
    SetTextColour(255, 255, 255, 255);
    SetTextOutline();

    AddTextComponentString(text);
    DrawText(worldToMap[1], worldToMap[2]);
}

async function insideTrunk(playerPed: number): Promise<void> {
    const vehicle = GetEntityAttachedTo(playerPed);
    if (!DoesEntityExist(vehicle) || IsPedDeadOrDying(playerPed, true) || IsPedFatallyInjured(playerPed)) {
        inTrunk = false;
        SetEntityCollision(playerPed, true, true);
        DetachEntity(playerPed, true, true);
        SetEntityVisible(playerPed, true, false);
        ClearPedTasks(playerPed);
        const offsetWorldCoords = GetOffsetFromEntityInWorldCoords(playerPed, 0.0, -0.5, -0.75);
        SetEntityCoords(playerPed, offsetWorldCoords[0], offsetWorldCoords[1], offsetWorldCoords[2], false, false, false, false);
        return Promise.resolve();
    }

    const bootBone = GetEntityBoneIndexByName(vehicle, 'boot');
    const bootCoords = GetWorldPositionOfEntityBone(vehicle, bootBone);
    SetEntityCollision(playerPed, false, false);
    DrawText3D(bootCoords, language.actionLeave);
    if (GetVehicleDoorAngleRatio(vehicle, DOOR_BOOT) < 0.9) {
        SetEntityVisible(playerPed, false, false);
    } else if (!IsEntityPlayingAnim(playerPed, TrunkAnimation.DICT, TrunkAnimation.NAME, TrunkAnimation.FLAG)) {
        while (!HasAnimDictLoaded(TrunkAnimation.DICT)) {
            await runWithTimeout(() => RequestAnimDict(TrunkAnimation.DICT), 5);
        }
        TaskPlayAnim(playerPed, TrunkAnimation.DICT, TrunkAnimation.NAME, 8.0, -8.0, -1, 1, 0, false, false, false);
        SetEntityVisible(playerPed, true, false);
    }
    if (IsControlJustReleased(0, 38) && inTrunk) {
        inTrunk = false;
        SetCarBootOpen(vehicle);
        SetEntityCollision(playerPed, true, true);
        await runWithTimeout(() => DetachEntity(playerPed, true, true), 750);
        SetEntityVisible(playerPed, true, false);
        ClearPedTasksImmediately(playerPed);
        const offsetWorldCoords = GetOffsetFromEntityInWorldCoords(playerPed, 0.0, -0.5, -0.75);
        SetEntityCoords(playerPed, offsetWorldCoords[0], offsetWorldCoords[1], offsetWorldCoords[2], false, false, false, false);
        await runWithTimeout(() => SetVehicleDoorShut(vehicle, DOOR_BOOT, false), 250);
    }
}

async function outsideTrunk(playerPed: number): Promise<void> {
    const pedCoords = GetEntityCoords(playerPed, true);
    const vehicle = GetClosestVehicle(pedCoords[0], pedCoords[1], pedCoords[2], 10, 0, 70);
    if (!DoesEntityExist(vehicle)) {
        return Promise.resolve();
    }
    if (!IsVehicleSeatFree(vehicle, SEAT_DRIVER)) {
        return Promise.resolve();
    }
    const lockStatus = GetVehicleDoorLockStatus(vehicle);
    if (lockStatus !== LOCK_UNLOCKED) {
        return Promise.resolve();
    }
    const bootBone = GetEntityBoneIndexByName(vehicle, 'boot');
    if (bootBone === -1) {
        return Promise.resolve();
    }
    const bootCoords = GetWorldPositionOfEntityBone(vehicle, bootBone);
    if (GetDistanceBetweenCoords(pedCoords[0], pedCoords[1], pedCoords[2], bootCoords[0], bootCoords[1], bootCoords[2], true) > 1.5) {
        return Promise.resolve();
    }
    DrawText3D(bootCoords, language.actionEnter);
    if (IsControlJustReleased(0, 74)) {
        if (GetVehicleDoorAngleRatio(vehicle, DOOR_BOOT) < 0.9) {
            SetCarBootOpen(vehicle);
        } else {
            SetVehicleDoorShut(vehicle, DOOR_BOOT, false);
        }
    }
    if (IsControlJustReleased(0, 38) && !inTrunk && !IsEntityAttached(playerPed) && !IsEntityAttachedToAnyPed(vehicle)) {
        inTrunk = true;
        SetCarBootOpen(vehicle);
        await runWithTimeout(() => AttachEntityToEntity(playerPed, vehicle, -1, 0, -2.2, 0.5, 0, 0, 0, false, false, false, false, 20, true), 350);
        while (!HasAnimDictLoaded(TrunkAnimation.DICT)) {
            await runWithTimeout(() => RequestAnimDict(TrunkAnimation.DICT), 5);
        }
        TaskPlayAnim(playerPed, TrunkAnimation.DICT, TrunkAnimation.NAME, 8.0, -8.0, -1, 1, 0, false, false, false);
        await runWithTimeout(() => SetVehicleDoorShut(vehicle, DOOR_BOOT, false), 500);
    }
}

setTick(async () => {
    const playerPed = PlayerPedId();
    if (inTrunk) {
        await insideTrunk(playerPed);
    } else {
        await outsideTrunk(playerPed);
    }
});
