package mth.models;

import java.io.Serializable;
import java.util.Objects;

public class RolesmappingId implements Serializable {
    private Long role;
    private Long mid;

    public RolesmappingId() {}

    public RolesmappingId(Long role, Long mid) {
        this.role = role;
        this.mid = mid;
    }

    public Long getRole() { return role; }
    public void setRole(Long role) { this.role = role; }
    public Long getMid() { return mid; }
    public void setMid(Long mid) { this.mid = mid; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RolesmappingId that)) return false;
        return Objects.equals(role, that.role) && Objects.equals(mid, that.mid);
    }

    @Override
    public int hashCode() {
        return Objects.hash(role, mid);
    }
}
