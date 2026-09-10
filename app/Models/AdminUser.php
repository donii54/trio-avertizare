<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;

class AdminUser extends Model implements AuthenticatableContract
{
    use Authenticatable;

    protected $table    = 'admin_users';
    protected $fillable = ['username', 'password'];
    protected $hidden   = ['password'];

    protected $casts = [
        'password' => 'hashed',
    ];
}
